export const mockProjects = [
  {
    id: '1',
    name: 'Landing Page Exemplo',
    html: `<div class="container">
  <h1>Bem-vindo!</h1>
  <p>Esta é uma landing page de exemplo.</p>
  <button id="cta">Começar Agora</button>
</div>`,
    css: `body {
  margin: 0;
  font-family: 'Arial', sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.container {
  text-align: center;
  color: white;
  padding: 40px;
}

h1 {
  font-size: 48px;
  margin-bottom: 20px;
}

p {
  font-size: 20px;
  margin-bottom: 30px;
}

button {
  background: white;
  color: #667eea;
  border: none;
  padding: 15px 40px;
  font-size: 18px;
  border-radius: 30px;
  cursor: pointer;
  transition: transform 0.2s;
}

button:hover {
  transform: scale(1.05);
}`,
    js: `document.getElementById('cta')?.addEventListener('click', () => {
  alert('Botão clicado! 🚀');
});`,
    createdAt: new Date('2025-01-15').toISOString(),
    updatedAt: new Date('2025-01-15').toISOString(),
  },
  {
    id: '2',
    name: 'Portfólio Simples',
    html: `<div class="portfolio">
  <header>
    <h1>Meu Portfólio</h1>
    <nav>
      <a href="#">Sobre</a>
      <a href="#">Projetos</a>
      <a href="#">Contato</a>
    </nav>
  </header>
  <main>
    <section class="hero">
      <h2>Desenvolvedor Full Stack</h2>
      <p>Criando experiências digitais incríveis</p>
    </section>
  </main>
</div>`,
    css: `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Helvetica', sans-serif;
  background: #0a0a0a;
  color: white;
}

header {
  padding: 20px 40px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255,255,255,0.05);
  backdrop-filter: blur(10px);
}

nav {
  display: flex;
  gap: 30px;
}

a {
  color: white;
  text-decoration: none;
  transition: color 0.3s;
}

a:hover {
  color: #00ff88;
}

.hero {
  padding: 100px 40px;
  text-align: center;
}

.hero h2 {
  font-size: 56px;
  margin-bottom: 20px;
  background: linear-gradient(to right, #00ff88, #00ccff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}`,
    js: `console.log('Portfólio carregado!');`,
    createdAt: new Date('2025-01-14').toISOString(),
    updatedAt: new Date('2025-01-14').toISOString(),
  },
];