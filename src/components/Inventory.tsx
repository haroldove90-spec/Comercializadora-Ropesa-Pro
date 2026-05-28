
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Search, Package, Trash2, Edit3, Save, X, Loader2, DollarSign, Tag, Info } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
}

export default function Products({ userRole }: { userRole: string | null }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: ''
  });

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setProducts(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
    
    // Realtime sync
    const channel = supabase
      .channel('products_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        fetchProducts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price) return;

    setIsSaving(true);
    try {
      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update({
            name: formData.name,
            description: formData.description,
            price: parseFloat(formData.price)
          })
          .eq('id', editingProduct.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('products')
          .insert([{
            name: formData.name,
            description: formData.description,
            price: parseFloat(formData.price)
          }]);

        if (error) throw error;
      }
      
      setShowAddModal(false);
      setEditingProduct(null);
      setFormData({ name: '', description: '', price: '' });
      fetchProducts();
    } catch (error: any) {
      alert('Error al guardar producto: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price.toString()
    });
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingProduct(null);
    setFormData({ name: '', description: '', price: '' });
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('¿Eliminar este producto?')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) alert('Error al eliminar');
    else fetchProducts();
  };

  const handleBulkDeleteProducts = async () => {
    if (selectedProductIds.length === 0) return;
    if (!confirm(`¿Estás seguro de eliminar los ${selectedProductIds.length} productos seleccionados?`)) return;

    const { error } = await supabase
      .from('products')
      .delete()
      .in('id', selectedProductIds);

    if (error) {
      alert('Error al eliminar productos: ' + error.message);
    } else {
      setSelectedProductIds([]);
      fetchProducts();
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight leading-none uppercase italic">Catálogo de <span className="text-sky-500">Productos</span></h1>
          <p className="text-slate-500 mt-2 font-bold italic uppercase text-[10px] tracking-wider">Gestión centralizada para ventas y pedidos</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              setEditingProduct(null);
              setFormData({ name: '', description: '', price: '' });
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all active:scale-95 shrink-0"
          >
            <Plus size={18} /> Nuevo Producto
          </button>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-sky-500 outline-none transition-all shadow-sm font-bold text-sm"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white p-12 rounded-[32px] border border-slate-100 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="animate-spin mb-4" size={32} />
          <p className="font-black uppercase tracking-widest text-[10px]">Cargando inventario...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white p-20 rounded-[48px] border border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 text-slate-200">
            <Package size={40} />
          </div>
          <h3 className="text-xl font-black text-slate-800 uppercase italic">Sin productos <span className="text-slate-400">registrados</span></h3>
          <p className="text-sm font-bold text-slate-400 mt-2">Comienza agregando productos para que tus clientes puedan verlos.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredProducts.length > 0 && (
            <div className="bg-slate-50 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 border border-slate-100">
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox"
                  className="rounded border-slate-200 accent-sky-500 cursor-pointer w-4 h-4 ml-1"
                  checked={selectedProductIds.length === filteredProducts.length && filteredProducts.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedProductIds(filteredProducts.map(p => p.id));
                    } else {
                      setSelectedProductIds([]);
                    }
                  }}
                />
                <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
                  Seleccionar todos los productos ({filteredProducts.length})
                </span>
              </div>

              {selectedProductIds.length > 0 && userRole === 'admin' && (
                <button
                  onClick={handleBulkDeleteProducts}
                  className="flex items-center gap-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all"
                >
                  <Trash2 size={12} />
                  Eliminar {selectedProductIds.length} Seleccionados
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <motion.div
                layout
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    {userRole === 'admin' && (
                      <input 
                        type="checkbox"
                        className="rounded border-slate-200 accent-sky-500 cursor-pointer w-4 h-4"
                        checked={selectedProductIds.includes(product.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedProductIds(prev => [...prev, product.id]);
                          } else {
                            setSelectedProductIds(prev => prev.filter(id => id !== product.id));
                          }
                        }}
                      />
                    )}
                    <div className="p-3 bg-sky-50 text-sky-500 rounded-2xl group-hover:scale-110 transition-transform">
                      <Tag size={24} />
                    </div>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleStartEdit(product)} 
                      className="p-2 text-slate-400 hover:text-sky-500 transition-colors"
                    >
                      <Edit3 size={18} />
                    </button>
                    {userRole === 'admin' && (
                      <button 
                        onClick={() => handleDeleteProduct(product.id)}
                        className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
              
              <h3 className="text-lg font-black text-slate-800 leading-tight uppercase italic">{product.name}</h3>
              <p className="text-slate-500 text-xs mt-2 line-clamp-2 font-medium leading-relaxed">
                {product.description || 'Sin descripción disponible.'}
              </p>
              
              <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Precio Venta</p>
                  <p className="text-2xl font-black text-emerald-500">${product.price.toFixed(2)}</p>
                </div>
                <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                  <Info size={18} />
                </div>
              </div>
            </motion.div>
          ))}
          </div>
        </div>
      )}

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-[40px] shadow-2xl z-[101] overflow-hidden"
            >
              <div className="p-8 pb-4 flex justify-between items-center">
                <h2 className="text-2xl font-black text-slate-800 uppercase italic">
                  {editingProduct ? 'Editar' : 'Nuevo'} <span className="text-sky-500">Producto</span>
                </h2>
                <button onClick={handleCloseModal} className="p-2 text-slate-400 hover:text-slate-800">
                  <X />
                </button>
              </div>

              <form onSubmit={handleSaveProduct} className="p-8 pt-4 space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Nombre del Producto</label>
                  <input 
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Ej. Garrafón 20L Purificada"
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Descripción</label>
                  <textarea 
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Detalles sobre el envase o proceso..."
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-sky-500 outline-none h-24 resize-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Precio Unitario ($)</label>
                  <div className="relative">
                    <DollarSign size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" />
                    <input 
                      required
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({...formData, price: e.target.value})}
                      placeholder="0.00"
                      className="w-full p-4 pl-10 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-sky-500 outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 p-4 rounded-2xl font-black uppercase text-[10px] tracking-widest text-slate-400 hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={isSaving}
                    className="flex-3 bg-sky-500 text-white p-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-sky-200 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                    {editingProduct ? 'Guardar Cambios' : 'Registrar Producto'}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
