import React, { useState } from 'react';
import { InventoryItem } from '../lib/db.ts';

interface InventoryPageProps {
  items: InventoryItem[];
  onAddItem: (item: Omit<InventoryItem, 'id'>) => Promise<void>;
  onUpdateItem: (item: InventoryItem) => Promise<void>;
  onDeleteItem: (itemId: number) => Promise<void>;
}

const EMPTY_ITEM: Omit<InventoryItem, 'id'> = { name: '', category: 'Foam Sets', quantity: 0, unitCost: 0, notes: '' };

const InventoryPage: React.FC<InventoryPageProps> = ({ items, onAddItem, onUpdateItem, onDeleteItem }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Omit<InventoryItem, 'id'> | InventoryItem | null>(null);

  const handleOpenAddModal = () => {
    setEditingItem(EMPTY_ITEM);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!editingItem) return;
    const { name, value } = e.target;
    const isNumeric = ['quantity', 'unitCost'].includes(name);
    setEditingItem(prev => ({ ...prev!, [name]: isNumeric ? parseFloat(value) || 0 : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editingItem.name) return;

    if ('id' in editingItem && editingItem.id) {
      await onUpdateItem(editingItem);
    } else {
      await onAddItem(editingItem);
    }
    handleCloseModal();
  };

  const handleAdjustQuantity = async (item: InventoryItem, amount: number) => {
    const newQuantity = Math.max(0, item.quantity + amount);
    await onUpdateItem({ ...item, quantity: newQuantity });
  };

  const handleDelete = async (itemId: number) => {
    if (window.confirm("Are you sure you want to permanently delete this inventory item?")) {
      await onDeleteItem(itemId);
    }
  };

  const card = "rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 shadow-sm";
  const label = "text-sm font-medium text-slate-600 dark:text-slate-300";
  const input = "mt-1 w-full rounded-lg border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-600/50 px-4 py-2.5 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white";

  return (
    <>
      <div className="mx-auto max-w-4xl p-4 sm:p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold dark:text-white">Inventory Management</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Track stock levels for all your materials and supplies.
            </p>
          </div>
          <button onClick={handleOpenAddModal} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white font-semibold shadow hover:bg-blue-700">
            + Add Item
          </button>
        </div>
        
        <div className={`${card} p-4`}>
          <div className="space-y-3">
            {items.length === 0 ? (
              <p className="text-center text-sm text-slate-500 dark:text-slate-400 py-6">
                No inventory items yet. Click "+ Add Item" to get started.
              </p>
            ) : (
              items.map(item => (
                <div key={item.id} className="p-3 rounded-lg border bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex-grow">
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{item.name}</p>
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">{item.category}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Qty:</span>
                    <button onClick={() => handleAdjustQuantity(item, -1)} className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 font-bold text-lg">-</button>
                    <span className="text-lg font-bold w-12 text-center">{item.quantity}</span>
                    <button onClick={() => handleAdjustQuantity(item, 1)} className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 font-bold text-lg">+</button>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button onClick={() => handleOpenEditModal(item)} className="p-2 rounded-full text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-600">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                     <button onClick={() => handleDelete(item.id!)} className="p-2 rounded-full text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {isModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" aria-modal="true" role="dialog">
          <div className="relative w-full max-w-md rounded-xl bg-white dark:bg-slate-800 p-6 shadow-xl">
            <button onClick={handleCloseModal} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" aria-label="Close modal">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <form onSubmit={handleSubmit}>
              <h2 className="text-xl font-bold dark:text-white">{'id' in editingItem ? 'Edit' : 'Add'} Inventory Item</h2>
              <div className="mt-4 space-y-3">
                <label className="block"><span className={label}>Item Name</span><input type="text" name="name" value={editingItem.name} onChange={handleInputChange} className={input} required /></label>
                <label className="block"><span className={label}>Category</span><input type="text" name="category" value={editingItem.category} onChange={handleInputChange} className={input} required /></label>
                <div className="grid grid-cols-2 gap-4">
                  <label className="block"><span className={label}>Quantity</span><input type="number" name="quantity" value={editingItem.quantity} onChange={handleInputChange} className={input} min="0" /></label>
                  <label className="block"><span className={label}>Unit Cost ($)</span><input type="number" name="unitCost" value={editingItem.unitCost || ''} onChange={handleInputChange} className={input} min="0" step="0.01" placeholder="Optional" /></label>
                </div>
                <label className="block"><span className={label}>Notes</span><textarea name="notes" rows={2} value={editingItem.notes || ''} onChange={handleInputChange} className={input}></textarea></label>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={handleCloseModal} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700">Cancel</button>
                <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white shadow hover:bg-blue-700">Save Item</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default InventoryPage;