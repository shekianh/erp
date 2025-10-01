import React from 'react';
import { Settings, X, RefreshCw } from 'lucide-react';

// Declaração para o objeto global injetado pelo Zebra Browser Print
declare const Zebra: any;

interface ZebraDevice {
    uid: string;
    name: string;
    deviceType: string;
}

interface PrinterSettingsProps {
    isOpen: boolean;
    onClose: () => void;
    availableDevices: ZebraDevice[];
    selectedDevice: ZebraDevice | null;
    onSelectDevice: (device: ZebraDevice | null) => void;
    onDiscoverDevices: () => void;
}

const PrinterSettingsModal: React.FC<PrinterSettingsProps> = ({
    isOpen,
    onClose,
    availableDevices,
    selectedDevice,
    onSelectDevice,
    onDiscoverDevices
}) => {
    if (!isOpen) return null;

    const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedUid = event.target.value;
        const device = availableDevices.find(d => d.uid === selectedUid) || null;
        onSelectDevice(device);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center">
                        <Settings className="mr-2" /> Configurações de Impressão
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
                        <X size={24} />
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label htmlFor="printer-select" className="block text-sm font-medium text-gray-700 mb-1">
                            Impressora Padrão (Zebra)
                        </label>
                        <div className="flex items-center gap-2">
                            <select
                                id="printer-select"
                                value={selectedDevice?.uid || ''}
                                onChange={handleSelectChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={availableDevices.length === 0}
                            >
                                <option value="" disabled>
                                    {availableDevices.length > 0 ? 'Selecione uma impressora' : 'Nenhuma impressora encontrada'}
                                </option>
                                {availableDevices.map(device => (
                                    <option key={device.uid} value={device.uid}>
                                        {device.name} ({device.deviceType})
                                    </option>
                                ))}
                            </select>
                            <button onClick={onDiscoverDevices} className="p-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300" title="Procurar impressoras">
                                <RefreshCw size={20} />
                            </button>
                        </div>
                    </div>
                    
                    {selectedDevice && (
                        <div className="bg-green-50 text-green-800 p-3 rounded-md text-sm">
                            Impressora <strong>{selectedDevice.name}</strong> está selecionada.
                        </div>
                    )}
                    
                    {/* MENSAGEM DE AJUDA MELHORADA */}
                    {availableDevices.length === 0 && (
                         <div className="bg-yellow-50 text-yellow-800 p-3 rounded-md text-sm">
                            <p className="font-bold">Não foi possível encontrar uma impressora.</p>
                            <ul className="list-disc list-inside mt-2 space-y-1">
                                <li>Verifique se o aplicativo <strong>Zebra Browser Print</strong> está em execução no seu computador (geralmente um ícone perto do relógio).</li>
                                <li>Confirme se a sua impressora Zebra está ligada e conectada à rede ou via USB.</li>
                                <li>Após verificar, clique no botão de recarregar <RefreshCw size={14} className="inline-block align-middle" /> para procurar novamente.</li>
                            </ul>
                        </div>
                    )}

                     {!selectedDevice && availableDevices.length > 0 && (
                         <div className="bg-yellow-50 text-yellow-800 p-3 rounded-md text-sm">
                            Por favor, selecione uma impressora na lista para ativar a impressão direta.
                        </div>
                    )}
                </div>

                <div className="mt-6 flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PrinterSettingsModal;