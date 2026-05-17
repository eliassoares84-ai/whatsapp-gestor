Diretrizes de Arquitetura e Boas Práticas (Para o Desenvolvedor/IA)
Clean Code & Tipagem Estrita: Todo o projeto deve utilizar TypeScript. Interfaces e tipos devem ser isolados em uma pasta src/types/.

Gerenciamento de Estado Centralizado: Utilizar o Zustand para o controle de estado global. Os dados do perfil do usuário e as transações financeiras de cada workspace devem ser persistidos localmente via AsyncStorage de forma criptografada ou estruturada.

Camada de UI Isolada: Regras de negócio, cálculos matemáticos de relatórios e formatações de moeda devem ficar em utilitários puros (src/utils/), completamente separados dos componentes visuais do React Native.

Internacionalização (i18n): Nenhuma string de texto deve ser escrita diretamente nos componentes (hardcoded). Use react-i18next para gerenciar as chaves em Português.