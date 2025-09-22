import { useState, useEffect } from 'react';
import { Plus, CreditCard, Edit, Trash2, Calendar, DollarSign, Link, RefreshCw, Unlink, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { CreditCard as CreditCardType, CreateCreditCard } from '@/shared/types';
import CreditCardBillManager from './CreditCardBillManager';

interface ExtendedCreditCard extends CreditCardType {
  linked_account_id?: number;
  linked_account_name?: string;
  linked_account_balance?: number;
  linked_credit_limit?: number;
  linked_available_credit?: number;
  linked_minimum_payment?: number;
  linked_due_date?: string;
}

interface AvailableAccount {
  id: number;
  name: string;
  institution_name?: string;
  balance: number;
  credit_limit?: number;
  available_credit_limit?: number;
}

export default function CreditCardManager() {
  const [cards, setCards] = useState<ExtendedCreditCard[]>([]);
  const [availableAccounts, setAvailableAccounts] = useState<AvailableAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkingCard, setLinkingCard] = useState<ExtendedCreditCard | null>(null);
  const [editingCard, setEditingCard] = useState<ExtendedCreditCard | null>(null);
  const [syncingCard, setSyncingCard] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'cards' | 'bills'>('cards');
  const [formData, setFormData] = useState<CreateCreditCard>({
    name: '',
    credit_limit: 0,
    current_balance: 0,
    due_day: 1,
  });

  const fetchCards = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/credit-cards');
      const data = await response.json();
      setCards(data.creditCards || []);
    } catch (error) {
      console.error('Erro ao buscar cartões:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableAccounts = async () => {
    try {
      const response = await fetch('/api/credit-cards/available-accounts');
      const data = await response.json();
      setAvailableAccounts(data.accounts || []);
    } catch (error) {
      console.error('Erro ao buscar contas disponíveis:', error);
    }
  };

  useEffect(() => {
    fetchCards();
    fetchAvailableAccounts();
  }, []);

  const resetForm = () => {
    setFormData({
      name: '',
      credit_limit: 0,
      current_balance: 0,
      due_day: 1,
    });
    setEditingCard(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = editingCard ? `/api/credit-cards/${editingCard.id}` : '/api/credit-cards';
      const method = editingCard ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchCards();
        resetForm();
      }
    } catch (error) {
      console.error('Erro ao salvar cartão:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (card: CreditCardType) => {
    setEditingCard(card);
    setFormData({
      name: card.name,
      credit_limit: card.credit_limit,
      current_balance: card.current_balance,
      due_day: card.due_day,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este cartão?')) return;

    try {
      const response = await fetch(`/api/credit-cards/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchCards();
      }
    } catch (error) {
      console.error('Erro ao excluir cartão:', error);
    }
  };

  const handleLinkCard = (card: ExtendedCreditCard) => {
    setLinkingCard(card);
    setShowLinkModal(true);
    fetchAvailableAccounts();
  };

  const handleUnlinkCard = async (cardId: number) => {
    if (!confirm('Tem certeza que deseja desvincular este cartão?')) return;

    try {
      const response = await fetch(`/api/credit-cards/${cardId}/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: null }),
      });

      if (response.ok) {
        await fetchCards();
        await fetchAvailableAccounts();
      }
    } catch (error) {
      console.error('Erro ao desvincular cartão:', error);
    }
  };

  const handleConfirmLink = async (accountId: number) => {
    if (!linkingCard) return;

    try {
      const response = await fetch(`/api/credit-cards/${linkingCard.id}/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      });

      if (response.ok) {
        await fetchCards();
        await fetchAvailableAccounts();
        setShowLinkModal(false);
        setLinkingCard(null);
      }
    } catch (error) {
      console.error('Erro ao vincular cartão:', error);
    }
  };

  const handleSyncCard = async (cardId: number) => {
    try {
      setSyncingCard(cardId);
      const response = await fetch(`/api/credit-cards/${cardId}/sync`, {
        method: 'POST',
      });

      if (response.ok) {
        await fetchCards();
      }
    } catch (error) {
      console.error('Erro ao sincronizar cartão:', error);
    } finally {
      setSyncingCard(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  const getUtilizationPercentage = (current: number, limit: number) => {
    return limit > 0 ? (current / limit) * 100 : 0;
  };

  const getUtilizationColor = (percentage: number) => {
    if (percentage >= 80) return 'text-red-600 bg-red-100';
    if (percentage >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 rounded-xl">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Cartões de Crédito</h2>
              <p className="text-gray-600">Gerencie seus cartões, limites e faturas</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {activeTab === 'cards' && (
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg"
              >
                <Plus className="w-5 h-5" />
                Adicionar Cartão
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setActiveTab('cards')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all flex-1 justify-center ${
              activeTab === 'cards'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-blue-600'
            }`}
          >
            <CreditCard className="w-5 h-5" />
            Cartões
          </button>
          <button
            onClick={() => setActiveTab('bills')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all flex-1 justify-center ${
              activeTab === 'bills'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-blue-600'
            }`}
          >
            <FileText className="w-5 h-5" />
            Faturas
          </button>
        </div>

        {/* Link Modal */}
        {showLinkModal && linkingCard && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Vincular "{linkingCard.name}" com conta Pluggy
              </h3>
              
              <div className="space-y-4">
                {availableAccounts.length === 0 ? (
                  <div className="text-center py-8">
                    <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">
                      Nenhuma conta de cartão de crédito disponível do Pluggy.
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      Sincronize suas contas primeiro para ver as opções disponíveis.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600 mb-3">
                      Selecione uma conta do Pluggy para vincular:
                    </p>
                    {availableAccounts.map((account) => (
                      <div
                        key={account.id}
                        onClick={() => handleConfirmLink(account.id)}
                        className="p-4 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-gray-900">{account.name}</h4>
                            {account.institution_name && (
                              <p className="text-sm text-gray-600">{account.institution_name}</p>
                            )}
                            <div className="flex gap-4 text-xs text-gray-500 mt-1">
                              <span>Saldo: {formatCurrency(Math.abs(account.balance))}</span>
                              {account.credit_limit && (
                                <span>Limite: {formatCurrency(account.credit_limit)}</span>
                              )}
                            </div>
                          </div>
                          <Link className="w-5 h-5 text-blue-600" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowLinkModal(false);
                    setLinkingCard(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'cards' ? (
          <>
            {/* Form */}
            {showForm && (
          <form onSubmit={handleSubmit} className="bg-gray-50 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">
              {editingCard ? 'Editar Cartão' : 'Novo Cartão de Crédito'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome do Cartão
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: Cartão Banco do Brasil"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Limite de Crédito
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.credit_limit || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, credit_limit: parseFloat(e.target.value) || 0 }))}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0,00"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Saldo Atual
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.current_balance || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, current_balance: parseFloat(e.target.value) || 0 }))}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0,00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dia do Vencimento
                </label>
                <select
                  value={formData.due_day}
                  onChange={(e) => setFormData(prev => ({ ...prev, due_day: parseInt(e.target.value) }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                    <option key={day} value={day}>Dia {day}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? 'Salvando...' : editingCard ? 'Atualizar' : 'Adicionar'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        {/* Cards List */}
        <div className="space-y-4">
          {cards.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhum cartão cadastrado</h3>
              <p className="text-gray-600">Adicione seus cartões para acompanhar limites e utilização.</p>
            </div>
          ) : (
            cards.map((card) => {
              const currentBalance = card.linked_account_balance ? Math.abs(card.linked_account_balance) : card.current_balance;
              const creditLimit = card.linked_credit_limit || card.credit_limit;
              const utilizationPercent = getUtilizationPercentage(currentBalance, creditLimit);
              return (
                <div
                  key={card.id}
                  className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-8 h-8 text-blue-600" />
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-gray-900">{card.name}</h3>
                          {card.linked_account_id ? (
                            <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                              <CheckCircle className="w-3 h-3" />
                              Pluggy
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                              <AlertCircle className="w-3 h-3" />
                              Manual
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span>Vence dia {card.due_day}</span>
                          {card.linked_account_name && (
                            <>
                              <span>•</span>
                              <span className="text-green-600">{card.linked_account_name}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {card.linked_account_id ? (
                        <>
                          <button
                            onClick={() => handleSyncCard(card.id)}
                            disabled={syncingCard === card.id}
                            className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50"
                            title="Sincronizar dados do Pluggy"
                          >
                            <RefreshCw className={`w-4 h-4 ${syncingCard === card.id ? 'animate-spin' : ''}`} />
                          </button>
                          <button
                            onClick={() => handleUnlinkCard(card.id)}
                            className="p-2 text-orange-600 hover:bg-orange-100 rounded-lg transition-colors"
                            title="Desvincular conta Pluggy"
                          >
                            <Unlink className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleLinkCard(card)}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                          title="Vincular com conta Pluggy"
                        >
                          <Link className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(card)}
                        className="p-2 text-blue-600 hover:bg-blue-200 rounded-lg transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(card.id)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="w-5 h-5 text-green-600" />
                        <span className="text-sm font-medium text-gray-600">Limite Total</span>
                      </div>
                      <p className="text-xl font-bold text-gray-900">
                        {formatCurrency(card.linked_credit_limit || card.credit_limit)}
                      </p>
                      {card.linked_credit_limit && card.linked_credit_limit !== card.credit_limit && (
                        <p className="text-xs text-green-600">
                          (Sincronizado: {formatCurrency(card.linked_credit_limit)})
                        </p>
                      )}
                    </div>

                    <div className="bg-white rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="w-5 h-5 text-red-600" />
                        <span className="text-sm font-medium text-gray-600">Saldo Atual</span>
                      </div>
                      <p className="text-xl font-bold text-gray-900">
                        {formatCurrency(card.linked_account_balance ? Math.abs(card.linked_account_balance) : card.current_balance)}
                      </p>
                      {card.linked_account_balance && Math.abs(card.linked_account_balance) !== card.current_balance && (
                        <p className="text-xs text-red-600">
                          (Sincronizado: {formatCurrency(Math.abs(card.linked_account_balance))})
                        </p>
                      )}
                    </div>

                    <div className="bg-white rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="w-5 h-5 text-blue-600" />
                        <span className="text-sm font-medium text-gray-600">Limite Disponível</span>
                      </div>
                      <p className="text-xl font-bold text-gray-900">
                        {card.linked_available_credit ? 
                          formatCurrency(card.linked_available_credit) :
                          formatCurrency((card.linked_credit_limit || card.credit_limit) - (card.linked_account_balance ? Math.abs(card.linked_account_balance) : card.current_balance))
                        }
                      </p>
                      {card.linked_available_credit && (
                        <p className="text-xs text-blue-600">
                          (Pluggy: {formatCurrency(card.linked_available_credit)})
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Pluggy Sync Status */}
                  {card.linked_account_id && (
                    <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-medium text-green-800">
                            Vinculado com {card.linked_account_name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {card.linked_minimum_payment && (
                            <span className="text-xs text-green-700">
                              Pagamento mín: {formatCurrency(card.linked_minimum_payment)}
                            </span>
                          )}
                          {card.linked_due_date && (
                            <span className="text-xs text-green-700">
                              Vence: {new Date(card.linked_due_date).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Utilization Bar */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600">Utilização do Limite</span>
                      <span className={`text-sm font-bold px-2 py-1 rounded-full ${getUtilizationColor(utilizationPercent)}`}>
                        {utilizationPercent.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          utilizationPercent >= 80 ? 'bg-red-500' :
                          utilizationPercent >= 60 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
                      ></div>
                    </div>
                    {card.linked_account_id && (
                      <p className="text-xs text-gray-500 mt-1">
                        Dados sincronizados automaticamente do Pluggy
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
          </>
        ) : (
          /* Bills Tab Content */
          <CreditCardBillManager />
        )}
      </div>
    </div>
  );
}
