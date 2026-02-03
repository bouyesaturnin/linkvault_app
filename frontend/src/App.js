import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './App.css';

// --- CONFIGURATION DE L'INSTANCE API ---
// Remplace ton instance axios actuelle par celle-ci :
const API_URL = window.location.hostname === "localhost" 
  ? "http://localhost:8000/api/" 
  : "https://ton-app-sur-render.onrender.com/api/"; // Remplace par ton URL Render

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function App() {
  // --- ÉTATS ---
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('access'));
  const [isRegistering, setIsRegistering] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [todos, setTodos] = useState([]);
  const [categories, setCategories] = useState([]);

  // États des formulaires
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [catName, setCatName] = useState('');
  const [catColor, setCatColor] = useState('#6366f1');
  const [searchTerm, setSearchTerm] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // --- ACTIONS CRUD ---

  const fetchTodos = useCallback(async () => {
    try {
      const response = await api.get('todos/');
      setTodos(response.data);
    } catch (error) {
      if (error.response?.status === 401) handleLogout();
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await api.get('categories/');
      setCategories(response.data);
    } catch (error) {
      console.error("Erreur catégories:", error);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      fetchTodos();
      fetchCategories();
    }
  }, [isLoggedIn, fetchTodos, fetchCategories]);

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    try {
      const response = await axios.post('http://localhost:8000/api/token/', { username, password });
      localStorage.setItem('access', response.data.access);
      localStorage.setItem('refresh', response.data.refresh);
      setIsLoggedIn(true);
      setErrorMsg('');
    } catch (error) {
      setErrorMsg('Identifiants invalides.');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:8000/api/register/', { username, password, email });
      handleLogin(); // Connecte l'utilisateur après l'inscription
    } catch (error) {
      setErrorMsg("Erreur d'inscription. L'utilisateur existe peut-être déjà.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    setIsLoggedIn(false);
    setTodos([]);
    setCategories([]);
    setIsRegistering(false);
  };

  const addTodo = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setIsSubmitting(true);
    try {
      await api.post('todos/', { 
        title, 
        description, 
        completed: false,
        category: selectedCategory || null 
      });
      setTitle('');
      setDescription('');
      setSelectedCategory('');
      fetchTodos();
    } catch (error) {
      console.error('Erreur ajout:', error);
    } finally {
      setIsSubmitting(false);
    }

    const validateURL = (url) => {
    const pattern = new RegExp('^(https?:\\/\\/)?'+ // protocole
    '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domaine
    '((\\d{1,3}\\.){3}\\d{1,3}))'); // ou IP
    return !!pattern.test(url);
};

      // Dans addTodo :
    if (!validateURL(description)) { // Si tu utilises le champ description pour l'URL
    setErrorMsg("Veuillez entrer une URL valide !");
    return;
}
  };

  const addCategory = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('categories/', { name: catName, color: catColor });
      setCategories([...categories, response.data]);
      setCatName('');
    } catch (error) {
      console.error("Erreur catégorie:", error);
    }
  };

  const deleteCategory = async (id) => {
    if (!window.confirm("Supprimer cette catégorie ?")) return;
    try {
      await api.delete(`categories/${id}/`);
      setCategories(categories.filter(cat => cat.id !== id));
      fetchTodos();
    } catch (error) {
      console.error('Erreur suppression:', error);
    }
  };

  const deleteTodo = async (id) => {
    try {
      await api.delete(`todos/${id}/`);
      fetchTodos();
    } catch (error) {
      console.error('Erreur suppression:', error);
    }
  };

  const toggleComplete = async (id, currentStatus) => {
    try {
      await api.patch(`todos/${id}/`, { completed: !currentStatus });
      fetchTodos();
    } catch (error) {
      console.error('Erreur modification:', error);
    }
  };

  const filteredTodos = todos.filter((todo) => 
    todo.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    todo.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- RENDU FINAL ---
  return (
    <div className="min-h-screen bg-gray-50 antialiased text-gray-900">
      {/* HEADER PERMANENT */}
      <nav className="bg-white border-b py-4 px-6 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-white">L</div>
          <span className="text-xl font-bold text-gray-800">LinkVault</span>
        </div>
        {isLoggedIn && (
          <button onClick={handleLogout} className="text-red-500 font-bold hover:bg-red-50 px-4 py-2 rounded-lg transition-colors">
            Déconnexion
          </button>
        )}
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-12">
        {isLoggedIn ? (
          /* --- DASHBOARD (SI CONNECTÉ) --- */
          <>
            {/* SECTION CATÉGORIES */}
            <section className="bg-white rounded-3xl shadow-xl p-6 mb-8 border border-gray-100">
              <h3 className="font-bold mb-4">Mes Catégories</h3>
              <form onSubmit={addCategory} className="flex gap-4 mb-4">
                <input type="text" placeholder="Nom" className="flex-1 px-4 py-2 bg-gray-50 border rounded-xl" value={catName} onChange={(e) => setCatName(e.target.value)} required />
                <input type="color" className="w-12 h-10 border-none bg-transparent" value={catColor} onChange={(e) => setCatColor(e.target.value)} />
                <button type="submit" className="px-6 py-2 bg-gray-800 text-white rounded-xl">Ajouter</button>
              </form>
              <div className="flex flex-wrap gap-2">
                {categories.map(c => (
                  <div key={c.id} className="flex items-center gap-2 px-3 py-1 rounded-full text-white text-xs font-bold shadow-sm" style={{backgroundColor: c.color}}>
                    <span>{c.name}</span>
                    <button onClick={() => deleteCategory(c.id)} className="bg-white/20 rounded-full w-4 h-4 flex items-center justify-center hover:bg-white/40">×</button>
                  </div>
                ))}
              </div>
            </section>

            {/* FORMULAIRE TODO */}
            <section className="bg-white rounded-3xl shadow-xl p-8 mb-12 border border-gray-100">
              <form onSubmit={addTodo} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <input type="text" placeholder="Titre du lien" className="px-4 py-3 bg-gray-50 border rounded-xl" value={title} onChange={(e) => setTitle(e.target.value)} required />
                  <input type="text" placeholder="Description" className="px-4 py-3 bg-gray-50 border rounded-xl" value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <select className="w-full px-4 py-3 bg-gray-50 border rounded-xl outline-none" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
                  <option value="">Choisir une catégorie (Optionnel)</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700">
                  {isSubmitting ? 'Enregistrement...' : 'Sauvegarder le lien'}
                </button>
              </form>
            </section>

            {/* LISTE DES TODOS */}
            <section className="space-y-4">
              <input type="text" placeholder="Rechercher un lien..." className="w-full p-3 border rounded-xl mb-6 shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              {filteredTodos.map((todo) => {
                const categoryInfo = categories.find(cat => cat.id === todo.category);
                return (
                  <div key={todo.id} className="flex items-center justify-between p-6 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                      <button onClick={() => toggleComplete(todo.id, todo.completed)} className={`w-6 h-6 rounded-full border-2 ${todo.completed ? 'bg-green-500 border-green-500' : 'border-gray-300'}`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className={`font-bold ${todo.completed ? 'line-through text-gray-300' : ''}`}>{todo.title}</h4>
                          {categoryInfo && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase text-white shadow-sm" style={{ backgroundColor: categoryInfo.color }}>
                              {categoryInfo.name}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{todo.description}</p>
                      </div>
                    </div>
                    <button onClick={() => deleteTodo(todo.id)} className="text-red-300 hover:text-red-500 font-bold">Supprimer</button>
                  </div>
                );
              })}
            </section>
          </>
        ) : (
          /* --- AUTH (SI DÉCONNECTÉ) --- */
          <div className="max-w-md mx-auto mt-10 space-y-8 bg-white p-10 rounded-2xl shadow-xl border border-gray-100">
            <div className="text-center">
              <h2 className="text-3xl font-extrabold text-gray-900">{isRegistering ? 'Créer un compte' : 'Bon retour !'}</h2>
              <p className="text-gray-500 mt-2">Gérez vos liens efficacement.</p>
            </div>
            <form className="mt-8 space-y-4" onSubmit={isRegistering ? handleRegister : handleLogin}>
              {errorMsg && <p className="text-red-500 text-sm text-center bg-red-50 py-2 rounded-lg">{errorMsg}</p>}
              <input type="text" required className="w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Nom d'utilisateur" value={username} onChange={(e) => setUsername(e.target.value)} />
              {isRegistering && (
                <input type="email" className="w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
              )}
              <input type="password" required className="w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} />
              <button type="submit" className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700">
                {isRegistering ? "S'inscrire" : "Se connecter"}
              </button>
            </form>
            <div className="text-center pt-4">
              <button onClick={() => { setIsRegistering(!isRegistering); setErrorMsg(''); }} className="text-sm text-indigo-600 font-semibold hover:underline">
                {isRegistering ? "Déjà membre ? Connectez-vous" : "Pas encore de compte ? Inscrivez-vous"}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;