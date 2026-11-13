/* Language: English by default, Brazilian Portuguese when the visitor's
   browser prefers it or they pick it. Static text is tagged data-i18n; the
   English is read from the page itself, the Portuguese lives here. */
(() => {
  'use strict';
  const PT = {
      "m11": "Seguir",
      "m10": "Resenha",
      "m9": "Nota",
      "m8": "Álbum",
      "m7": "Busca",
      "m6": "Um Letterboxd para música: avalie e resenhe álbuns, mantenha uma lista para ouvir, siga outros ouvintes. Uma API em NestJS e PostgreSQL por trás de um app React Native, com cada página de álbum tematizada pela capa.",
      "m5": "L1 / Plataforma de reviews, API + app mobile",
      "m4": "A visão geral responde uma pergunta antes de tudo: meu mês fecha?",
      "m3": "Mudar um preço nunca reescreve o histórico. O valor novo vale daquele mês em diante; faturas fechadas mantêm o delas.",
      "m2": "A IA propõe, a aritmética decide. Um LLM lê o extrato; uma checagem de conciliação decide o que entra.",
      "m1": "Três usuários de teste expuseram todos os problemas e nos colocaram para trabalhar. Fiz engenharia e produto de ponta a ponta, de features e design a infra, além de vendas e comunicação, e aprendi muito de finanças e contabilidade no caminho.",
      "t0": "Pular para o conteúdo",
      "t1": "01 Trabalho",
      "t2": "02 Como penso",
      "t3": "03 Textos",
      "t4": "05 Sobre",
      "t5": "Contato + CV",
      "t6": "<span class=\"nw\">Engenheiro de software</span> / <span class=\"nw\">Autodidata desde os 14</span>",
      "t7": "Engenheiro backend para fintech e IA. Construo software que <em class=\"serif\">fecha a conta</em>.",
      "t8": "Ver o trabalho <svg class=\"i\"><use href=\"#i-d\"/></svg>",
      "t9": "Fale comigo <svg class=\"i\"><use href=\"#i-r\"/></svg>",
      "t10": "Base",
      "t11": "Agora",
      "t12": "XoPlanilha, em produção",
      "t13": "<span class=\"sq\" aria-hidden=\"true\"></span>Aberto a estágios e vagas júnior, 2027",
      "t14": "Arraste uma face para girá-la, ou arraste ao lado para olhar em volta. Teclado: U, D, L, R, F e B giram uma face no sentido horário; com Shift, no sentido contrário. As setas giram o cubo inteiro.",
      "t15": "movimentos",
      "t16": "Embaralhar",
      "t17": "Resolver",
      "t18": "Trabalhos selecionados",
      "t19": "A1 / SaaS B2B de gestão financeira / jan–jun 2026",
      "t20": "Cofundador e CTO. Desenhei a arquitetura e construí o caminho de um documento bruto até um lançamento conciliado.",
      "t21": "O que construí",
      "t22": "Contas a pagar e a receber, transações, conciliação",
      "t23": "Pipelines de documentos com parsers e LLMs",
      "t24": "Categorização por IA que aprende os padrões de cada usuário",
      "t25": "Autenticação, alertas financeiros, relatórios em PDF",
      "t26": "Pagamentos via AbacatePay",
      "t27": "Deploys, backups, releases seguros",
      "t28": "Fig. 1 / Concilie você mesmo",
      "t29": "Dados de exemplo",
      "t30": "Razão / escolha um lançamento",
      "t31": "Banco / depois o par",
      "t32": "Em aberto",
      "t33": "Conciliar tudo",
      "t34": "Reiniciar",
      "t35": "Fig. 1b / Como um documento vira um lançamento conciliado",
      "t36": "Arquitetura do Raia",
      "t37": "Documentos passam por parsers e LLMs até o núcleo, um schema PostgreSQL de 14 tabelas com transações, contas a pagar e a receber, conciliação e autenticação. O núcleo alimenta a categorização por IA, que aprende os padrões de cada usuário e devolve o resultado, além de alertas financeiros e relatórios em PDF. O AbacatePay cuida dos pagamentos. Deploys, backups e releases seguros rodam por baixo.",
      "t38": "Documentos",
      "t39": "POSTGRESQL / 14 TABELAS",
      "t40": "Transações",
      "t41": "Pagar + receber",
      "t42": "Conciliação",
      "t43": "Categorização IA",
      "t44": "APRENDE POR USUÁRIO",
      "t45": "Alertas financeiros",
      "t46": "Relatórios PDF",
      "t47": "OPS / DEPLOYS, BACKUPS, RELEASES SEGUROS",
      "t48": "PostgreSQL, 14 tabelas",
      "t49": "Resultado",
      "t50": "D1 / Decisão",
      "t51": "D2 / Decisão",
      "t52": "D3 / Decisão",
      "t53": "Parsers e LLMs dividem um único pipeline de documentos.",
      "t54": "A categorização aprende os padrões de cada usuário.",
      "t55": "Um schema de 14 tabelas guarda o razão.",
      "t56": "Fig. 2 / Importe um extrato",
      "t57": "Importar de novo",
      "t58": "A2 / Plataforma de finanças pessoais / abr 2026–hoje",
      "t59": "Uma metodologia de consultoria financeira transformada em software. Extratos entram, categorias saem.",
      "t60": "Receitas + despesas recorrentes",
      "t61": "Metas",
      "t62": "Acompanhamento de investimentos",
      "t63": "Importação de documentos",
      "t64": "Categorização automática",
      "t65": "Usuários em produção",
      "t66": "Função",
      "t67": "Engenheiro de software",
      "t68": "Origem",
      "t69": "Projeto freelance, 2025",
      "t70": "Decisões",
      "t71": "A3 / jun–dez 2025",
      "t72": "Software sob medida para dois clientes, e a primeira versão do que virou o XoPlanilha.",
      "t73": "Como eu <em class=\"serif\">penso</em>",
      "t74": "Domínio primeiro.",
      "t75": "Entendo como o dinheiro se move antes de nomear uma tabela.",
      "t76": "O certo, não o costume.",
      "t77": "O problema escolhe a ferramenta. Parsers onde as regras valem, LLMs onde elas param.",
      "t78": "Mantenha simples.",
      "t79": "Entrego a versão que consigo explicar em um parágrafo e manter sozinho.",
      "t80": "Textos",
      "t81": "Todos os posts no Substack <svg class=\"i\"><use href=\"#i-ur\"/></svg>",
      "t82": "fev 2026",
      "t83": "ago 2025",
      "t84": "set 2025",
      "t85": "Por que você faz o que faz? Sobre construir por vontade de verdade.",
      "t86": "Minha primeira empresa, um SaaS, aos 16. O que ela me ensinou.",
      "t87": "Sobre criar, motivação e não se contentar com a primeira decisão.",
      "t88": "(abre o Substack)",
      "t89": "L1 / Framework de agentes",
      "t90": "Em desenvolvimento",
      "t91": "Um framework pessoal de agentes de IA. Meu próprio harness de orquestração, em LangGraph.",
      "t92": "Início",
      "t93": "Nó",
      "t94": "Aresta",
      "t95": "Fim",
      "t96": "L2 / Emulador, do zero",
      "t97": "Código no GitHub <svg class=\"i\"><use href=\"#i-ur\"/></svg>",
      "t98": "Instrução",
      "t99": "Passo",
      "t100": "Sobre",
      "t101": "Sou o Miguel, 18 anos. Aprendi a programar sozinho aos 14, estudei TI no Senac Sorocaba, cofundei o Raia como CTO e coloquei o XoPlanilha em produção. Vou prestar Ciência da Computação para 2027.",
      "t102": "Ferramentas do dia a dia",
      "t103": "Contato",
      "t104": "<svg class=\"i\" aria-hidden=\"true\"><use href=\"#i-mail\"/></svg>C1 E-mail",
      "t105": "Baixar o CV",
      "t106": "Saldo, fim da página",
      "t107": "Aberto a estágios e vagas júnior, 2027.",
      "t108": "Trabalho",
      "t109": "Ideias"
  };
  const PT_ARIA = {
    'Primary': 'Principal',
    'Miguel Broedel, home': 'Miguel Broedel, início',
    'Elsewhere': 'Em outros lugares',
    'Email': 'E-mail',
    "A working Rubik's cube drawn in halftone dots": 'Um cubo mágico funcional desenhado em pontos',
    'Raia architecture diagram, scrolls sideways on small screens': 'Diagrama da arquitetura do Raia, rola para o lado em telas pequenas',
    'Features': 'Funcionalidades',
    'Graph': 'Grafo',
    'A review, step by step': 'Uma resenha, passo a passo',
    'Sections': 'Seções'
  };
  const PT_JS = {
    Solved: 'Resolvido', Scrambled: 'Embaralhado', Run: 'Rodar', Pause: 'Pausar',
    'balance closed': 'saldo fechado', open: 'em aberto', reopened: 'reaberto.', 'Now pick the bank line for': 'Agora escolha a linha do banco para',
    matched: 'conciliado', 'matched.': 'conciliado.', 'does not match': 'não bate com', 'of': 'de', categorized: 'categorizados',
    'select to reopen': 'selecione para reabrir', selected: 'selecionado', unmatched: 'sem par',
    'Supplier invoice': 'Nota de fornecedor', Subscription: 'Assinatura', 'Client payment': 'Pagamento de cliente',
    'PIX RECEIVED': 'PIX RECEBIDO', 'TED SENT': 'TED ENVIADA', 'CARD PURCHASE': 'COMPRA NO CARTÃO',
    Transport: 'Transporte', Groceries: 'Mercado', Recurring: 'Recorrente', 'Recurring income': 'Receita recorrente', Investment: 'Investimento'
  };
  const META = {
    en: { title: document.title, desc: (document.querySelector('meta[name=description]') || {}).content },
    pt: { title: 'Miguel Broedel / Engenheiro backend, fintech e IA', desc: 'Miguel Broedel, engenheiro backend para fintech e IA. Sorocaba, São Paulo, Brasil.' }
  };
  const nodes = Array.from(document.querySelectorAll('[data-i18n]')).map((el) => ({ el, en: el.innerHTML, pt: PT[el.dataset.i18n] }));
  const arias = Array.from(document.querySelectorAll('[aria-label]')).filter((el) => PT_ARIA[el.getAttribute('aria-label')])
    .map((el) => ({ el, en: el.getAttribute('aria-label') }));
  const subs = [];
  let lang = 'en';
  try { lang = localStorage.getItem('lang') || ''; } catch (e) { lang = ''; }
  if (lang !== 'en' && lang !== 'pt') {
    const prefs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'en'];
    lang = /^pt\b/i.test(prefs[0] || '') ? 'pt' : 'en';
  }

  const api = {
    get lang() { return lang; },
    t: (s) => (lang === 'pt' && PT_JS[s]) || s,
    // 1,250.00 -> 1.250,00
    num: (s) => (lang === 'pt' ? String(s).replace(/[.,]/g, (c) => (c === '.' ? ',' : '.')) : String(s)),
    money: (v) => v.toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    on: (fn) => subs.push(fn),
    set(next, save) {
      lang = next === 'pt' ? 'pt' : 'en';
      if (save) { try { localStorage.setItem('lang', lang); } catch (e) { /* private mode */ } }
      document.documentElement.lang = lang === 'pt' ? 'pt-BR' : 'en';
      nodes.forEach((n) => { n.el.innerHTML = lang === 'pt' ? n.pt : n.en; });
      arias.forEach((a) => a.el.setAttribute('aria-label', lang === 'pt' ? PT_ARIA[a.en] : a.en));
      document.title = META[lang].title;
      const d = document.querySelector('meta[name=description]'); if (d) d.content = META[lang].desc;
      const b = document.querySelector('.lang');
      if (b) {
        b.dataset.lang = lang;
        b.setAttribute('aria-label', lang === 'pt' ? 'View in English' : 'Ver em português');
        b.setAttribute('lang', lang === 'pt' ? 'en' : 'pt-BR');
      }
      subs.forEach((fn) => fn(lang));
    }
  };
  window.I18N = api;
  api.set(lang, false);
  const btn = document.querySelector('.lang');
  if (btn) btn.addEventListener('click', () => api.set(lang === 'pt' ? 'en' : 'pt', true));
})();
