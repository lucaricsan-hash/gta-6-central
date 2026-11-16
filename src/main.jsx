import React, { useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { supabase, isSupabaseConfigured } from './supabase';
import {
  Newspaper, Users, CarFront, Map, Home, LogIn, LogOut, Heart,
  MessageCircle, Send, UserCircle, RefreshCw, BookOpen, Star,
  ShieldCheck, KeyRound
} from 'lucide-react';
import './style.css';

const tabs = [
  ['home', 'Início', Home], ['news', 'Notícias', Newspaper],
  ['community', 'Comunidade', Users], ['garage', 'Garagem', CarFront],
  ['map', 'Mapa', Map], ['guides', 'Guias', BookOpen],
  ['profile', 'Perfil', UserCircle]
];

function friendlyError(error) {
  const message = error?.message || 'Ocorreu um erro inesperado.';
  if (/Invalid login credentials/i.test(message)) return 'E-mail ou senha incorretos.';
  if (/User already registered/i.test(message)) return 'Este e-mail já possui uma conta. Tente entrar.';
  if (/Password should be at least/i.test(message)) return 'A senha precisa ter pelo menos 8 caracteres.';
  if (/Email not confirmed/i.test(message)) return 'Confirme seu e-mail antes de entrar.';
  return message;
}

function App() {
  const [tab, setTab] = useState('home');
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [draft, setDraft] = useState('');
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [postsLoading, setPostsLoading] = useState(false);

  useEffect(() => {
    if (!supabase) return undefined;
    let alive = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!alive) return;
      if (error) setMessage(friendlyError(error));
      setSession(data?.session ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => { alive = false; subscription.unsubscribe(); };
  }, []);

  const loadPosts = useCallback(async () => {
    if (!supabase) { setPosts([]); return; }
    setPostsLoading(true);
    const { data, error } = await supabase
      .from('posts')
      .select('id,content,created_at,author_id,profiles(display_name),post_likes(user_id),comments(id,content,created_at,author_id,profiles(display_name))')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) setMessage(`Não foi possível carregar as publicações: ${friendlyError(error)}`);
    else setPosts(data || []);
    setPostsLoading(false);
  }, []);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  useEffect(() => {
    let active = true;
    async function loadProfile() {
      if (!session || !supabase) { setProfile(null); return; }
      const { data, error } = await supabase.from('profiles')
        .select('id,display_name,created_at').eq('id', session.user.id).maybeSingle();
      if (!active) return;
      if (error) setMessage(`Não foi possível carregar seu perfil: ${friendlyError(error)}`);
      setProfile(data || null);
    }
    loadProfile();
    return () => { active = false; };
  }, [session]);

  async function handleAuth(event) {
    event.preventDefault();
    if (!supabase) return;
    setMessage(''); setLoading(true);
    try {
      let result;
      if (authMode === 'signup') {
        const cleanName = displayName.trim();
        if (cleanName.length < 2 || cleanName.length > 30) {
          setMessage('Seu nome de exibição deve ter entre 2 e 30 caracteres.');
          return;
        }
        result = await supabase.auth.signUp({
          email: email.trim(), password,
          options: { data: { display_name: cleanName } }
        });
      } else if (authMode === 'reset') {
        result = await supabase.auth.resetPasswordForEmail(email.trim());
      } else {
        result = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      }
      if (result.error) setMessage(friendlyError(result.error));
      else if (authMode === 'signup') setMessage('Cadastro enviado! Confira sua caixa de entrada para confirmar o e-mail.');
      else if (authMode === 'reset') setMessage('Se esse e-mail estiver cadastrado, você receberá um link para redefinir a senha.');
      else setMessage('Login realizado com sucesso.');
    } catch (error) { setMessage(friendlyError(error)); }
    finally { setLoading(false); }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    setMessage(error ? friendlyError(error) : 'Você saiu da sua conta.');
  }

  async function publish(event) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || !session) return;
    setLoading(true);
    const { error } = await supabase.from('posts').insert({ author_id: session.user.id, content });
    if (error) setMessage(friendlyError(error));
    else { setDraft(''); setMessage('Publicação enviada!'); await loadPosts(); }
    setLoading(false);
  }

  async function like(post) {
    if (!session) { setMessage('Entre na sua conta para curtir publicações.'); setTab('profile'); return; }
    const liked = (post.post_likes || []).some(item => item.user_id === session.user.id);
    const query = liked
      ? supabase.from('post_likes').delete().eq('post_id', post.id).eq('user_id', session.user.id)
      : supabase.from('post_likes').insert({ post_id: post.id, user_id: session.user.id });
    const { error } = await query;
    if (error) setMessage(friendlyError(error)); else await loadPosts();
  }

  async function comment(post, content) {
    if (!session) { setMessage('Entre na sua conta para comentar.'); setTab('profile'); return false; }
    const clean = content.trim();
    if (!clean || clean.length > 500) return false;
    const { error } = await supabase.from('comments').insert({
      post_id: post.id, author_id: session.user.id, content: clean
    });
    if (error) { setMessage(friendlyError(error)); return false; }
    await loadPosts();
    return true;
  }

  const name = profile?.display_name || session?.user?.user_metadata?.display_name || session?.user?.email?.split('@')[0] || 'Visitante';

  if (!isSupabaseConfigured) return <SetupScreen />;

  return <div className="app">
    <header className="top">
      <div className="brand"><span className="logo">✦</span><div><b>GTA 6 CENTRAL</b><small>VICE CITY • LEONIDA • COMMUNITY</small></div></div>
      <div className="user-actions">{session ? <><span className="muted">{name}</span><button className="outline" onClick={signOut}><LogOut size={16}/> Sair</button></> : <button className="primary" onClick={() => setTab('profile')}><LogIn size={16}/> Entrar</button>}</div>
    </header>

    <section className="hero"><span className="eyebrow">BEM-VINDO AO ESTADO DE LEONIDA</span><h1>O universo de <em>GTA VI</em><br/>em um só lugar.</h1><p>Notícias, guias, veículos e uma comunidade de fãs.</p><button className="primary" onClick={() => setTab('community')}>Explorar comunidade <Users size={16}/></button></section>

    <nav aria-label="Navegação principal">{tabs.map(([id, label, Icon]) => <button key={id} className={tab === id ? 'selected' : ''} onClick={() => setTab(id)}><Icon size={16}/>{label}</button>)}</nav>
    {message && <div className="message" role="status">{message}<button aria-label="Fechar aviso" onClick={() => setMessage('')}>×</button></div>}

    {tab === 'home' && <main className="grid">
      <section><h2>Explore o Central</h2><div className="tiles">
        {[
          ['news','📰','Notícias','Atualizações com fontes'],['community','💬','Comunidade','Teorias e descobertas'],
          ['garage','🏎️','Garagem','Categorias de veículos'],['map','🗺️','Mapa','Regiões de Leonida'],
          ['guides','📚','Guias','Dicas e conteúdo de fã']
        ].map(([id, icon, title, desc]) => <button className="tile" key={id} onClick={() => setTab(id)}><span>{icon}</span><b>{title}</b><small>{desc}</small></button>)}
      </div><div className="row"><h2>Comunidade recente</h2><button className="outline" onClick={loadPosts}><RefreshCw size={15}/> Atualizar</button></div><PostList posts={posts.slice(0, 3)} onLike={like} onComment={comment} session={session} loading={postsLoading}/></section>
      <aside className="panel"><h3>Seu perfil</h3><p>{session ? `Conectado como ${name}` : 'Entre para publicar e interagir com outros fãs.'}</p><button className="primary full" onClick={() => setTab('profile')}>{session ? 'Ver perfil' : 'Entrar ou criar conta'}</button><hr/><p className="tiny">Projeto independente de fãs. Não afiliado à Rockstar Games.</p></aside>
    </main>}

    {tab === 'news' && <main><h2>Notícias e atualizações</h2><div className="panel"><h3><ShieldCheck size={18}/> Central de notícias verificadas</h3><p>Esta área está preparada para receber notícias de fontes verificadas. O feed automático ainda depende de uma fonte/API e de uma rotina segura no servidor.</p><p className="tiny">Não exibimos manchetes inventadas nem tratamos rumores como fatos. Quando o banco estiver configurado, somente artigos aprovados serão exibidos.</p></div></main>}

    {tab === 'community' && <main><div className="row"><h2>Comunidade</h2><button className="outline" onClick={loadPosts} disabled={postsLoading}><RefreshCw size={15}/> Atualizar</button></div>
      {session ? <form className="composer" onSubmit={publish}><textarea value={draft} onChange={event => setDraft(event.target.value)} maxLength={1000} placeholder="Compartilhe uma teoria, descoberta ou opinião..." required/><div className="row"><small className="muted">{draft.length}/1000</small><button className="primary" disabled={loading || !draft.trim()}><Send size={15}/> Publicar</button></div></form> : <div className="panel"><p>Faça login para publicar, curtir e comentar. Você pode ler publicações públicas abaixo.</p><button className="primary" onClick={() => setTab('profile')}>Entrar ou criar conta</button></div>}
      <PostList posts={posts} onLike={like} onComment={comment} session={session} loading={postsLoading}/>
    </main>}

    {tab === 'garage' && <main><h2>Garagem de Leonida</h2><div className="tiles">{[
      ['🏎️','Carros','Esportivos, clássicos e utilitários'],['🏍️','Motos','Motocicletas'],['🚤','Barcos','Veículos aquáticos'],
      ['🛩️','Aeronaves','Aviões e helicópteros'],['🚲','Bicicletas','Duas rodas'],['🚓','Serviço','Emergência e serviço']
    ].map(item => <div className="tile" key={item[1]}><span>{item[0]}</span><b>{item[1]}</b><small>{item[2]}</small></div>)}</div><p className="tiny">Catálogo inicial por categorias; modelos individuais serão adicionados com fontes verificadas.</p></main>}

    {tab === 'map' && <main><h2>Mapa de Leonida</h2><div className="map"><b>LEONIDA</b><div><span>🌴 Vice City</span><span>🌊 Ambrosia</span><span>🐊 Grassrivers</span><span>🏖️ Port Gellhorn</span><span>🌅 Keys</span></div></div><p className="tiny">Painel ilustrativo, não é o mapa oficial nem um mapa navegável do jogo. Uma integração cartográfica poderá ser adicionada quando houver dados confiáveis.</p></main>}

    {tab === 'guides' && <main><h2>Guias e central de conhecimento</h2><div className="tiles">
      <article className="tile"><span>🧭</span><b>Começando por Leonida</b><small>Organize descobertas e informações confirmadas sobre o cenário do jogo.</small></article>
      <article className="tile"><span>🚘</span><b>Veículos</b><small>Guia futuro de classes, características e localizações confirmadas.</small></article>
      <article className="tile"><span>🎮</span><b>Dicas de gameplay</b><small>Conteúdo será atualizado quando houver informações verificáveis.</small></article>
      <article className="tile"><span>❓</span><b>Perguntas frequentes</b><small>Rumores serão identificados claramente e separados de anúncios oficiais.</small></article>
    </div></main>}

    {tab === 'profile' && <main><h2>Conta e perfil</h2>{session ? <div className="panel"><h3><UserCircle size={19}/> {name}</h3><p>{session.user.email}</p><p className="tiny">Conta autenticada pelo Supabase.</p><button className="outline" onClick={signOut}><LogOut size={16}/> Sair da conta</button></div> : <form className="auth panel" onSubmit={handleAuth}>
      <div className="switch"><button type="button" className={authMode === 'login' ? 'selected' : ''} onClick={() => setAuthMode('login')}>Entrar</button><button type="button" className={authMode === 'signup' ? 'selected' : ''} onClick={() => setAuthMode('signup')}>Criar conta</button></div>
      {authMode === 'signup' && <label>Nome de exibição<input value={displayName} onChange={event => setDisplayName(event.target.value)} minLength={2} maxLength={30} required autoComplete="nickname"/></label>}
      <label>E-mail<input type="email" value={email} onChange={event => setEmail(event.target.value)} required autoComplete="email"/></label>
      {authMode !== 'reset' && <label>Senha<input type="password" value={password} onChange={event => setPassword(event.target.value)} minLength={8} required autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}/></label>}
      <button className="primary full" disabled={loading}>{loading ? 'Aguarde...' : authMode === 'signup' ? 'Criar conta' : authMode === 'reset' ? 'Enviar link de recuperação' : 'Entrar'}</button>
      <div className="auth-links">{authMode === 'login' && <button type="button" onClick={() => setAuthMode('reset')}><KeyRound size={14}/> Esqueci minha senha</button>}{authMode === 'reset' && <button type="button" onClick={() => setAuthMode('login')}>Voltar para entrar</button>}</div>
      <p className="tiny">Ao criar uma conta, use um e-mail seu e uma senha exclusiva. Nunca compartilhe sua senha.</p>
    </form>}</main>}

    <footer>GTA 6 Central • Projeto independente de fãs • Não afiliado à Rockstar Games.</footer>
  </div>;
}

function PostList({ posts, onLike, onComment, session, loading }) {
  if (loading && !posts.length) return <div className="empty">Carregando publicações...</div>;
  if (!posts.length) return <div className="empty">Nenhuma publicação por enquanto.</div>;
  return <div>{posts.map(post => <PostCard key={post.id} post={post} onLike={onLike} onComment={onComment} session={session}/>)}</div>;
}

function PostCard({ post, onLike, onComment, session }) {
  const [commentText, setCommentText] = useState('');
  const [sending, setSending] = useState(false);
  async function submitComment(event) {
    event.preventDefault();
    if (!commentText.trim()) return;
    setSending(true);
    const success = await onComment(post, commentText);
    if (success) setCommentText('');
    setSending(false);
  }
  const date = new Date(post.created_at);
  return <article className="post">
    <div className="post-head"><b>{post.profiles?.display_name || 'Fã de GTA VI'}</b><small>{Number.isNaN(date.getTime()) ? '' : date.toLocaleString('pt-BR')}</small></div>
    <p>{post.content}</p>
    <div className="actions"><button onClick={() => onLike(post)}><Heart size={15}/> {post.post_likes?.length || 0}</button><span className="comment-count"><MessageCircle size={15}/> {post.comments?.length || 0} comentários</span></div>
    {(post.comments || []).map(comment => <div className="comment" key={comment.id}><b>{comment.profiles?.display_name || 'Fã'}:</b> {comment.content}</div>)}
    {session && <form className="comment-form" onSubmit={submitComment}><input aria-label="Escreva um comentário" value={commentText} onChange={event => setCommentText(event.target.value)} maxLength={500} placeholder="Escreva um comentário..."/><button className="outline" disabled={sending || !commentText.trim()} aria-label="Enviar comentário"><Send size={14}/></button></form>}
  </article>;
}

function SetupScreen() {
  return <div className="setup"><div className="brand"><span className="logo">✦</span><div><b>GTA 6 CENTRAL</b><small>VICE CITY • LEONIDA • COMMUNITY</small></div></div><div className="setup-card"><h1>Seu portal para GTA VI.</h1><p>O projeto online está preparado. Para ativar contas e comunidade compartilhada, conecte um projeto Supabase.</p><ol><li>Crie um projeto gratuito em <a href="https://supabase.com" target="_blank" rel="noreferrer">supabase.com</a>.</li><li>Abra <b>SQL Editor</b> e execute o arquivo <code>supabase/schema.sql</code> deste projeto.</li><li>Copie a URL e a chave pública anon em Project Settings → API.</li><li>Crie um arquivo <code>.env</code> usando <code>.env.example</code> e preencha os dois valores.</li><li>Execute <code>npm install</code> e <code>npm run dev</code>.</li></ol><div className="warning">Não coloque a chave <b>service_role</b> no navegador. Use somente a chave pública anon com as políticas RLS deste projeto.</div></div></div>;
}

createRoot(document.getElementById('root')).render(<App/>);
