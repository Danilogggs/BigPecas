## Tecnologias e fundamentos utilizados no projeto

O desenvolvimento deste projeto foi baseado em uma arquitetura moderna, com separação entre frontend, autenticação, persistência de dados e serviços de backend, buscando maior organização, escalabilidade e segurança.

No frontend, foi utilizada a biblioteca **React**, em conjunto com o **Vite**, para a construção de interfaces dinâmicas, componentizadas e com navegação fluida entre páginas. A lógica da aplicação foi desenvolvida em **JavaScript**, permitindo o controle de estados, manipulação de eventos, validações de formulário e integração com APIs externas.

Para a camada visual, foram utilizados **CSS** e recursos de responsividade, com o objetivo de proporcionar uma interface organizada, acessível e adaptável a diferentes tamanhos de tela.

No processo de autenticação, o projeto utiliza o **Firebase Authentication**, responsável pelo gerenciamento de cadastro, login, recuperação de senha e controle de sessão dos usuários. Complementando essa estrutura, o **Firestore** foi adotado como banco de dados NoSQL para armazenar informações complementares do perfil do usuário, como nome, email, CEP e gênero.

No backend, foi empregada uma arquitetura baseada em **microserviços com Node.js e Express**, possibilitando a separação de responsabilidades e uma melhor manutenção do sistema. Para integração segura com os serviços do Firebase no ambiente de servidor, foi utilizado o **Firebase Admin SDK**, responsável pela validação de tokens e pelo acesso controlado aos dados armazenados no Firestore.

## Principais elementos presentes no projeto

Ao longo do desenvolvimento, o projeto passou a contemplar os seguintes recursos e características:

- interfaces de cadastro, login e recuperação de senha;
- autenticação de usuários com Firebase;
- armazenamento e consulta de dados de perfil no Firestore;
- comunicação entre frontend e backend por meio de APIs;
- estrutura modular baseada em microserviços;
- cadastro e consulta de peças no sistema;
- tratamento de erros com mensagens mais claras e adequadas ao usuário final;
- organização do código com foco em manutenção, clareza e evolução futura.

## Síntese

De forma geral, o projeto reúne tecnologias atuais amplamente utilizadas no desenvolvimento web, integrando interface, autenticação, persistência de dados e serviços de backend em uma solução coesa. A estrutura adotada busca não apenas atender aos requisitos funcionais da aplicação, mas também favorecer boas práticas de desenvolvimento, segurança da informação e experiência do usuário.