import React from "react";

const Footer = () => {
  return (
    <footer className="bg-gray-950 text-gray-300 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div>
            <h2 className="text-2xl font-semibold text-white">Financeito</h2>
            <p className="mt-4 text-gray-400 leading-relaxed">
              Plataforma completa para acompanhar suas finanças pessoais, conectar contas
              bancárias e receber insights inteligentes com IA.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white">Produto</h3>
            <ul className="mt-4 space-y-3">
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors duration-200">Recursos</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors duration-200">Integrações</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors duration-200">Planos</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors duration-200">Atualizações</a></li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white">Empresa</h3>
            <ul className="mt-4 space-y-3">
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors duration-200">Sobre nós</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors duration-200">Carreiras</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors duration-200">Parceiros</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors duration-200">Blog</a></li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white">Suporte</h3>
            <ul className="mt-4 space-y-3">
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors duration-200">Central de Ajuda</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors duration-200">Documentação</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors duration-200">Status</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors duration-200">Support</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">&copy; {new Date().getFullYear()} Financeito. Todos os direitos reservados.</p>
          <div className="flex items-center gap-6 text-sm">
            <a href="#" className="text-gray-400 hover:text-white transition-colors duration-200">Termos</a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors duration-200">Privacidade</a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors duration-200">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
