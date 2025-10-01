import React, { useEffect, useState } from 'react'; // A vírgula e o "a" foram removidos
import { supabase } from '../lib/supabase';
import { X, Package, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

interface Item {
  item_codigo: string;
  item_descricao: string;
  item_quantidade: number;
}

interface OrderItemsModalProps {
  isOpen: boolean;
  onClose: () => void;
  numeroPedidoLoja: string | null;
}

const OrderItemsModal: React.FC<OrderItemsModalProps> = ({ isOpen, onClose, numeroPedidoLoja }) => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && numeroPedidoLoja) {
      const fetchItems = async () => {
        setLoading(true);
        setItems([]);
        try {
          const { data, error } = await supabase
            .from('item_pedido_vendas')
            .select('item_codigo, item_descricao, item_quantidade')
            .eq('numero_pedido_loja', numeroPedidoLoja);

          if (error) {
            throw new Error(error.message);
          }
          setItems(data || []);
        } catch (error: any) {
          toast.error('Erro ao buscar itens do pedido.');
        } finally {
          setLoading(false);
        }
      };
      fetchItems();
    }
  }, [isOpen, numeroPedidoLoja]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl">
        <div className="flex justify-between items-center mb-4 border-b pb-3">
          <h2 className="text-xl font-bold text-gray-800 flex items-center">
            <Package className="mr-2" /> Itens do Pedido: {numeroPedidoLoja}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
            <X size={24} />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center py-10">
              <RefreshCw className="h-6 w-6 animate-spin text-blue-600 mr-2" />
              <span className="text-gray-500">Carregando itens...</span>
            </div>
          ) : items.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descrição</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qtd.</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {items.map((item, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.item_codigo}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 max-w-sm truncate">{item.item_descricao}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">{item.item_quantidade}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-center py-10 text-gray-500">Nenhum item encontrado para este pedido.</p>
          )}
        </div>
        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderItemsModal;