import React from 'react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { errMsg } from './api';
import { useAuth } from './auth.jsx';

const fmt = (d) => (d ? new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '');

/* ---------- Public: list ---------- */
export function Home() {
  const [data, setData] = useState({ items: [], pages: 1 });
  const [cats, setCats] = useState([]);
  const [category, setCategory] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [apiError, setApiError] = useState('');

  useEffect(() => {
    api.get('/categories').then((r) => setCats(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, []);
  useEffect(() => {
    setLoading(true);
    api.get('/posts', { params: { category, q, page } })
      .then((r) => {
        if (!Array.isArray(r.data?.items)) throw new Error('bad response');
        setData(r.data); setApiError('');
      })
      .catch(() => setApiError('Cannot reach the API. Make sure the backend is running on port 5000 and MongoDB is connected.'))
      .finally(() => setLoading(false));
  }, [category, q, page]);

  return (
    <>
      <div className="filters">
        <input placeholder="Search posts" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <div className="chips">
          <button className={!category ? 'chip on' : 'chip'} onClick={() => { setCategory(''); setPage(1); }}>All</button>
          {cats.map((c) => (
            <button key={c._id} className={category === c.slug ? 'chip on' : 'chip'} onClick={() => { setCategory(c.slug); setPage(1); }}>{c.name}</button>
          ))}
        </div>
      </div>
      {apiError && <p className="error">{apiError}</p>}
      {loading ? <p className="muted">Loading…</p> : apiError ? null : data.items.length === 0 ? <p className="muted">No posts found.</p> : data.items.map((p) => (
        <article key={p._id} className="entry">
          <p className="meta">{p.category?.name || 'Uncategorized'} · {fmt(p.publishedAt)} · {p.author?.name}</p>
          <h2><Link to={`/post/${p.slug}`}>{p.title}</Link></h2>
          <p>{p.excerpt}</p>
        </article>
      ))}
      {data.pages > 1 && (
        <div className="pager">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span>Page {page} of {data.pages}</span>
          <button disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}
    </>
  );
}

/* ---------- Public: single post + comments ---------- */
export function PostPage() {
  const { slug } = useParams();
  const { user } = useAuth();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [form, setForm] = useState({ name: '', body: '' });
  const [error, setError] = useState('');

  const loadComments = (id) => api.get(`/posts/${id}/comments`).then((r) => setComments(r.data));
  useEffect(() => {
    api.get(`/posts/${slug}`).then((r) => { setPost(r.data); loadComments(r.data._id); }).catch((e) => setError(errMsg(e)));
  }, [slug]);

  const submit = async (e) => {
    e.preventDefault(); setError('');
    try {
      await api.post(`/posts/${post._id}/comments`, form);
      setForm({ name: '', body: '' });
      loadComments(post._id);
    } catch (err) { setError(errMsg(err)); }
  };
  const remove = async (id) => { await api.delete(`/comments/${id}`); loadComments(post._id); };
  const canModerate = user && (user.role === 'admin' || user.id === post?.author?._id);

  if (error && !post) return <p className="error">{error}</p>;
  if (!post) return <p className="muted">Loading…</p>;
  return (
    <article>
      <p className="meta">{post.category?.name || 'Uncategorized'} · {fmt(post.publishedAt || post.createdAt)} · {post.author?.name}{post.status === 'draft' && ' · Draft'}</p>
      <h1>{post.title}</h1>
      <div className="body">{post.content}</div>

      <section className="comments">
        <h3>{comments.length} {comments.length === 1 ? 'comment' : 'comments'}</h3>
        {post.status === 'published' && (
          <form onSubmit={submit}>
            {!user && <input placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />}
            <textarea rows="3" placeholder="Add a comment" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
            {error && <p className="error">{error}</p>}
            <button className="primary">Post comment</button>
          </form>
        )}
        {comments.map((c) => (
          <div key={c._id} className="comment">
            <p className="meta">{c.name} · {fmt(c.createdAt)} {canModerate && <button className="link danger" onClick={() => remove(c._id)}>Delete</button>}</p>
            <p>{c.body}</p>
          </div>
        ))}
      </section>
    </article>
  );
}

/* ---------- Login / Register ---------- */
export function AuthPage({ register }) {
  const { login } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault(); setError('');
    try {
      const r = await api.post(register ? '/auth/register' : '/auth/login', f);
      login(r.data); nav('/dashboard');
    } catch (err) { setError(errMsg(err)); }
  };
  return (
    <form className="narrow" onSubmit={submit}>
      <h1>{register ? 'Create account' : 'Log in'}</h1>
      {register && <input placeholder="Name" value={f.name} onChange={set('name')} />}
      <input type="email" placeholder="Email" value={f.email} onChange={set('email')} />
      <input type="password" placeholder="Password (6+ characters)" value={f.password} onChange={set('password')} />
      {error && <p className="error">{error}</p>}
      <button className="primary">{register ? 'Create account' : 'Log in'}</button>
    </form>
  );
}

/* ---------- Dashboard ---------- */
export function Dashboard() {
  const [posts, setPosts] = useState(null);
  const load = () => api.get('/posts/mine').then((r) => setPosts(r.data));
  useEffect(() => { load(); }, []);

  const toggle = async (id) => { await api.patch(`/posts/${id}/publish`); load(); };
  const del = async (id) => { if (confirm('Delete this post and its comments?')) { await api.delete(`/posts/${id}`); load(); } };

  if (!posts) return <p className="muted">Loading…</p>;
  return (
    <>
      <div className="row"><h1>My posts</h1><Link className="primary btn" to="/editor">Write a post</Link></div>
      {posts.length === 0 && <p className="muted">You haven't written anything yet.</p>}
      {posts.map((p) => (
        <div key={p._id} className="item">
          <div>
            <Link to={`/post/${p.slug}`}><strong>{p.title}</strong></Link>
            <p className="meta"><span className={`tag ${p.status}`}>{p.status}</span> {p.category?.name || 'Uncategorized'} · Updated {fmt(p.updatedAt)}</p>
          </div>
          <div className="actions">
            <Link to={`/editor/${p._id}`}>Edit</Link>
            <button className="link" onClick={() => toggle(p._id)}>{p.status === 'published' ? 'Unpublish' : 'Publish'}</button>
            <button className="link danger" onClick={() => del(p._id)}>Delete</button>
          </div>
        </div>
      ))}
    </>
  );
}

/* ---------- Editor (new + edit) ---------- */
export function Editor() {
  const { id } = useParams();
  const nav = useNavigate();
  const [cats, setCats] = useState([]);
  const [f, setF] = useState({ title: '', excerpt: '', content: '', category: '', status: 'draft' });
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  useEffect(() => {
    api.get('/categories').then((r) => setCats(r.data));
    if (id) api.get(`/posts/id/${id}`).then((r) => setF({ ...r.data, category: r.data.category || '' })).catch((e) => setError(errMsg(e)));
  }, [id]);

  const save = async (status) => {
    setError(''); setSaved(false);
    try {
      const body = { title: f.title, excerpt: f.excerpt, content: f.content, category: f.category, status };
      if (id) { await api.put(`/posts/${id}`, body); setF({ ...f, status }); setSaved(true); }
      else { await api.post('/posts', body); nav('/dashboard'); }
    } catch (e) { setError(errMsg(e)); }
  };

  return (
    <div className="editor">
      <h1>{id ? 'Edit post' : 'New post'}</h1>
      <input className="title" placeholder="Title" value={f.title} onChange={set('title')} />
      <input placeholder="Short summary shown on the home page" value={f.excerpt} onChange={set('excerpt')} />
      <select value={f.category} onChange={set('category')}>
        <option value="">No category</option>
        {cats.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
      </select>
      <textarea rows="16" placeholder="Write your post…" value={f.content} onChange={set('content')} />
      {error && <p className="error">{error}</p>}
      {saved && <p className="ok">Saved.</p>}
      <div className="row">
        <button onClick={() => save('draft')}>Save draft</button>
        <button className="primary" onClick={() => save('published')}>{f.status === 'published' ? 'Update published post' : 'Publish'}</button>
      </div>
    </div>
  );
}

/* ---------- Categories (admin) ---------- */
export function Categories() {
  const [list, setList] = useState([]);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const load = () => api.get('/categories').then((r) => setList(r.data));
  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault(); setError('');
    try { await api.post('/categories', { name }); setName(''); load(); } catch (err) { setError(errMsg(err)); }
  };
  const rename = async (c) => {
    const n = prompt('New name', c.name);
    if (n && n !== c.name) { try { await api.put(`/categories/${c._id}`, { name: n, description: c.description }); load(); } catch (err) { setError(errMsg(err)); } }
  };
  const del = async (c) => { if (confirm(`Delete "${c.name}"? Its posts become uncategorized.`)) { await api.delete(`/categories/${c._id}`); load(); } };

  return (
    <>
      <h1>Categories</h1>
      <form className="row" onSubmit={add}>
        <input placeholder="New category name" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="primary">Add category</button>
      </form>
      {error && <p className="error">{error}</p>}
      {list.map((c) => (
        <div key={c._id} className="item">
          <strong>{c.name}</strong>
          <div className="actions">
            <button className="link" onClick={() => rename(c)}>Rename</button>
            <button className="link danger" onClick={() => del(c)}>Delete</button>
          </div>
        </div>
      ))}
    </>
  );
}