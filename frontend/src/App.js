import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './App.css';

// Configuration de l'instance API
const BASE_URL = window.location.hostname === "localhost" 
  ? "http://localhost:8000/api/" 
  : "https://ton-app-sur-render.onrender.com/api/";

const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

function App() {
  // États globaux
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('access'));
  const [activeTab, setActiveTab] = useState('vault');
  const [todos, setTodos] = useState([]);
  const [clients, setClients] = useState([]);
  const [invoices, setInvoices] = useState([]);

  // États Formulaires Vault
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // États Formulaires Billing
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [showClientForm, setShowClientForm] = useState(false);
  const [selectedClientForInvoice, setSelectedClientForInvoice] = useState(null);
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [invoiceLabel, setInvoiceLabel] = useState('');

  // --- RÉCUPÉRATION DES DONNÉES ---
  const fetchData = useCallback(async () => {
    try {
      const [t, cl, inv] = await Promise.all([
        api.get('todos/'), 
        api.get('billing/clients/'), 
        api.get('billing/invoices/')
      ]);
      setTodos(t.data); 
      setClients(cl.data); 
      setInvoices(inv.data);
    } catch (error) { 
      if (error.response?.status === 401) handleLogout();
    }
  }, []);

  useEffect(() => { if (isLoggedIn) fetchData(); }, [isLoggedIn, fetchData]);

  // --- AUTHENTIFICATION ---
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const resp = await axios.post(`${BASE_URL}token/`, { username, password });
      localStorage.setItem('access', resp.data.access);
      setIsLoggedIn(true);
    } catch (error) { alert('Identifiants invalides'); }
  };

  const handleLogout = () => { localStorage.clear(); setIsLoggedIn(false); };

  // --- ACTIONS VAULT ---
  const deleteTodo = async (id) => {
    if (window.confirm("Supprimer ce lien ?")) {
      try {
        await api.delete(`todos/${id}/`);
        setTodos(todos.filter(t => t.id !== id));
      } catch (error) { console.error(error); }
    }
  };

  // --- ACTIONS FACTURATION ---
  const addClient = async (e) => {
    e.preventDefault();
    try {
      await api.post('billing/clients/', { name: clientName, email: clientEmail, address: clientAddress });
      setClientName(''); setClientEmail(''); setClientAddress('');
      setShowClientForm(false);
      fetchData();
    } catch (error) { console.error("Erreur client:", error); }
  };

  const createInvoice = async (e) => {
    e.preventDefault();
    try {
      await api.post('billing/invoices/', {
        client: selectedClientForInvoice.id,
        number: `INV-${Date.now()}`,
        label: invoiceLabel,
        total_ht: parseFloat(invoiceAmount),
        status: 'PENDING'
      });
      setSelectedClientForInvoice(null); setInvoiceAmount(''); setInvoiceLabel('');
      fetchData();
    } catch (error) { alert("Erreur 500 : Vérifiez vos champs côté Django."); }
  };

  const markAsPaid = async (id) => {
    try {
      await api.patch(`billing/invoices/${id}/`, { status: 'PAID' });
      fetchData();
    } catch (error) { console.error(error); }
  };

  const downloadInvoicePDF = (inv) => {
    const doc = new jsPDF();
    const client = clients.find(c => c.id === inv.client) || { name: "Client Inconnu", email: "-", address: "" };
    const primaryColor = [79, 70, 229];

    doc.setFontSize(20); doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]); doc.setFont(undefined, 'bold');
    doc.text("FACTURATION", 190, 15, { align: 'right' });

    doc.setFontSize(24); doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]); doc.setFont(undefined, 'bold');
    doc.text("LINKVAULT", 20, 25);

    doc.setFontSize(10); doc.setTextColor(100); doc.setFont(undefined, 'normal');
    doc.text("Société SARL", 20, 32);

    doc.setFontSize(10); 
    doc.setTextColor(100); 
    doc.setFont(undefined, 'normal');

    // Ta ligne actuelle
    doc.text("SIRET: 123 456 789 00012", 20, 35);

    // Nouvelles lignes (on descend de 6 en 6 sur l'axe Y)
    doc.text(`N° Facture : ${inv.number}`, 20, 48);
    doc.text(`Facture généré le : ${new Date(inv.created_at || Date.now()).toLocaleDateString()}`, 20, 52);

    doc.setFontSize(11); doc.setTextColor(50); doc.text("FACTURÉ À :", 120, 46);
    doc.setFont(undefined, 'bold'); doc.text(client.name.toUpperCase(), 120, 52);
    doc.setFont(undefined, 'normal'); doc.text(client.email, 120, 58);

    autoTable(doc, {
      startY: 70,
      head: [['Désignation', 'Qté', 'P.U. HT', 'Total HT']],
      body: [[inv.label, "1", `${parseFloat(inv.total_ht).toFixed(2)} €`, `${parseFloat(inv.total_ht).toFixed(2)} €`]],
      headStyles: { fillColor: primaryColor }
    });

    // On définit la position de départ (juste après le tableau)
const finalY = doc.lastAutoTable.finalY + 10;

doc.setFontSize(10);
doc.setTextColor(100);
doc.setFont(undefined, 'normal');

// Ligne Total HT
doc.text("Total HT :", 140, finalY);
doc.text(`${parseFloat(inv.total_ht).toFixed(2)} €`, 190, finalY, { align: 'right' });

// Ligne TVA (on descend de 7 unités)
doc.text("TVA (20%) :", 140, finalY + 7);
doc.text(`${(parseFloat(inv.total_ttc) - parseFloat(inv.total_ht)).toFixed(2)} €`, 190, finalY + 7, { align: 'right' });


    doc.setFontSize(12); doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]); doc.text(`TOTAL TTC : ${parseFloat(inv.total_ttc).toFixed(2)} €`, 190, finalY + 18, { align: 'right' });
    doc.save(`Facture_${inv.number}.pdf`);
    
  };

  // --- RENDU LOGIN ---
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <form className="p-10 bg-white rounded-2xl shadow-xl space-y-4" onSubmit={handleLogin}>
          <h2 className="text-2xl font-bold">LinkVault Login</h2>
          <input type="text" className="w-full p-3 border rounded-xl" placeholder="Admin" onChange={e => setUsername(e.target.value)} />
          <input type="password" className="w-full p-3 border rounded-xl" placeholder="Mot de passe" onChange={e => setPassword(e.target.value)} />
          <button className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold">Entrer</button>
        </form>
      </div>
    );
  }

  // --- RENDU PRINCIPAL ---
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b p-4 flex justify-between items-center shadow-sm">
        <div className="flex gap-6 items-center">
          <span className="font-bold text-indigo-600 text-xl">LINKVAULT</span>
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button onClick={() => setActiveTab('vault')} className={`px-4 py-1 rounded-md text-sm ${activeTab === 'vault' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}>Vault</button>
            <button onClick={() => setActiveTab('billing')} className={`px-4 py-1 rounded-md text-sm ${activeTab === 'billing' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}>Facturation</button>
          </div>
        </div>
        <button onClick={handleLogout} className="text-red-500 font-bold">Quitter</button>
      </nav>

      <main className="max-w-4xl mx-auto p-6">
        {activeTab === 'vault' ? (
          <div className="space-y-6">
            <section className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <input type="text" placeholder="Titre du lien" className="px-4 py-3 bg-gray-50 border rounded-xl outline-none" value={title} onChange={(e) => setTitle(e.target.value)} />
                <input type="text" placeholder="URL ou Note" className="px-4 py-3 bg-gray-50 border rounded-xl outline-none" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <button className="mt-4 w-full py-3 bg-indigo-600 text-white font-bold rounded-xl">Sauvegarder</button>
            </section>
            <input type="text" placeholder="Rechercher..." className="w-full p-4 border rounded-2xl bg-white" onChange={(e) => setSearchTerm(e.target.value)} />
            {todos.filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase())).map(todo => (
              <div key={todo.id} className="flex items-center justify-between p-6 bg-white rounded-2xl border shadow-sm">
                <div><h4 className="font-bold">{todo.title}</h4><p className="text-sm text-gray-500">{todo.description}</p></div>
                <button onClick={() => deleteTodo(todo.id)} className="px-4 py-2 bg-red-50 text-red-600 rounded-lg font-bold hover:bg-red-600 hover:text-white transition-all">Supprimer</button>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Statistiques */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-100">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Chiffre d'Affaires (HT)</p>
                <p className="text-2xl font-black text-indigo-600">
                  {invoices.filter(i => i.status === 'PAID').reduce((acc, inv) => acc + parseFloat(inv.total_ht || 0), 0).toFixed(2)} €
                </p>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Clients</p>
                <p className="text-2xl font-black text-gray-800">{clients.length}</p>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">En attente (HT)</p>
                <p className="text-2xl font-black text-orange-500">
                  {invoices.filter(i => i.status === 'PENDING').reduce((acc, inv) => acc + parseFloat(inv.total_ht || 0), 0).toFixed(2)} €
                </p>
              </div>
            </div>

            {/* Clients */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
              <div className="p-6 bg-indigo-900 text-white flex justify-between items-center">
                <h3 className="font-bold">Mes Clients</h3>
                <button onClick={() => setShowClientForm(!showClientForm)} className="bg-white text-indigo-900 px-4 py-2 rounded-lg text-sm font-bold">
                  {showClientForm ? 'Fermer' : '+ Nouveau Client'}
                </button>
              </div>
              {showClientForm && (
                <form onSubmit={addClient} className="p-6 bg-gray-50 border-b grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input type="text" placeholder="Nom" className="p-2 border rounded-lg" value={clientName} onChange={e => setClientName(e.target.value)} required />
                  <input type="email" placeholder="Email" className="p-2 border rounded-lg" value={clientEmail} onChange={e => setClientEmail(e.target.value)} required />
                  <input type="text" placeholder="Adresse" className="p-2 border rounded-lg" value={clientAddress} onChange={e => setClientAddress(e.target.value)} />
                  <button className="md:col-span-3 bg-indigo-600 text-white py-2 rounded-lg font-bold">Enregistrer</button>
                </form>
              )}
              <div className="p-4">
                <table className="w-full">
                  <thead className="text-xs text-gray-400 uppercase">
                    <tr><th className="p-2 text-left">Nom</th><th className="p-2 text-left">Email</th><th className="p-2 text-right">Action</th></tr>
                  </thead>
                  <tbody>
                    {clients.map(c => (
                      <tr key={c.id} className="border-t">
                        <td className="p-3 text-sm font-bold">{c.name}</td>
                        <td className="p-3 text-sm text-gray-500">{c.email}</td>
                        <td className="p-3 text-right">
                          <button onClick={() => setSelectedClientForInvoice(c)} className="text-indigo-600 text-xs font-bold">Facturer</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Création Facture */}
            {selectedClientForInvoice && (
              <form onSubmit={createInvoice} className="p-6 bg-indigo-50 rounded-2xl border-2 border-indigo-100 flex gap-4">
                <input placeholder="Description" className="flex-1 p-2 rounded" value={invoiceLabel} onChange={e => setInvoiceLabel(e.target.value)} required />
                <input placeholder="Montant HT" className="w-24 p-2 rounded" value={invoiceAmount} onChange={e => setInvoiceAmount(e.target.value)} required />
                <button className="bg-indigo-600 text-white px-4 rounded font-bold">Créer</button>
              </form>
            )}

            {/* Historique */}
            <div className="space-y-4">
              <h3 className="font-bold text-gray-400 text-xs uppercase text-left">Historique</h3>
              {invoices.length === 0 && <p className="text-gray-400 text-sm italic text-left">Aucune facture.</p>}
              {invoices.map(inv => (
                <div key={inv.id} className="bg-white p-5 rounded-2xl shadow-sm border flex justify-between items-center">
                  <div className="text-left">
                    <p className="font-bold">{inv.label}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${inv.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                      {inv.status === 'PAID' ? 'PAYÉE' : 'EN ATTENTE'}
                    </span>
                  </div>
                  <div className="flex gap-4 items-center">
                    <span className="font-black text-lg">{parseFloat(inv.total_ttc).toFixed(2)} €</span>
                    <button onClick={() => downloadInvoicePDF(inv)} className="p-2 text-gray-400 hover:text-indigo-600">📄</button>
                    {inv.status === 'PENDING' && (
                      <button onClick={() => markAsPaid(inv.id)} className="bg-green-500 text-white p-2 rounded-full hover:bg-green-600">✔</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;