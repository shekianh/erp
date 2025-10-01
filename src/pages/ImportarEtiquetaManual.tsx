import React, { useState, useEffect } from 'react';

// --- ESTILOS ---
const styles: { [key: string]: React.CSSProperties } = {
    container: { fontFamily: 'sans-serif', padding: '20px', maxWidth: '1000px', margin: '0 auto' },
    frame: { border: '1px solid #ccc', borderRadius: '8px', padding: '20px', marginBottom: '25px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' },
    label: { display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' },
    select: { padding: '8px', border: '1px solid #ccc', borderRadius: '4px', width: '100%' },
    controlsContainer: { display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap', marginTop: '15px' },
    controlGroup: { flex: '1 1 auto' },
    button: { padding: '10px 15px', fontSize: '14px', cursor: 'pointer', border: 'none', borderRadius: '5px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' },
    buttonBlue: { backgroundColor: '#007bff', color: 'white' },
    buttonPurple: { backgroundColor: '#6f42c1', color: 'white' },
    buttonGreen: { backgroundColor: '#28a745', color: 'white' },
    buttonOrange: { backgroundColor: '#fd7e14', color: 'white' },
    buttonDark: { backgroundColor: '#343a40', color: 'white' },
    buttonDisabled: { backgroundColor: '#aaa', cursor: 'not-allowed', color: '#555' },
    spinner: { border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', width: '16px', height: '16px', animation: 'spin 1s linear infinite', marginRight: '8px' },
    logBox: { background: '#2d2d2d', color: '#f8f8f2', padding: '15px', minHeight: '100px', maxHeight: '200px', overflowY: 'auto', whiteSpace: 'pre-wrap', wordWrap: 'break-word', borderRadius: '5px', fontSize: '14px', marginTop: '10px' },
    tableContainer: { maxHeight: '300px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '5px', backgroundColor: 'white' },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { padding: '10px', textAlign: 'left', backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6', position: 'sticky', top: 0, zIndex: 1 },
    td: { padding: '10px', borderBottom: '1px solid #eee' },
    trSelected: { backgroundColor: '#eef4ff' },
};
const keyframes = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;

interface Pedido { pedido_id: string; empresa: string; numero_pedido_loja: string; created_at: string; }
interface PedidosTableProps { pedidos: Pedido[]; selection: string | string[]; onSelect: (value: string) => void; isLoading: boolean; selectionType?: 'single' | 'multiple'; }

const PedidosTable: React.FC<PedidosTableProps> = ({ pedidos, selection, onSelect, isLoading, selectionType = 'single' }) => {
    const isSelected = (p: Pedido) => { const p_json = JSON.stringify(p); if (selectionType === 'multiple' && Array.isArray(selection)) { return selection.includes(p_json); } return selection === p_json; };
    return (
        <div style={styles.tableContainer}><table style={styles.table}>
            <thead><tr><th style={styles.th}></th><th style={styles.th}>Data Criação</th><th style={styles.th}>Pedido Loja</th><th style={styles.th}>Empresa</th></tr></thead>
            <tbody>
                {isLoading && <tr><td colSpan={4} style={{...styles.td, textAlign: 'center'}}>Carregando...</td></tr>}
                {!isLoading && pedidos.length === 0 && <tr><td colSpan={4} style={{...styles.td, textAlign: 'center'}}>Nenhum pedido encontrado.</td></tr>}
                {pedidos.map((p) => (<tr key={p.pedido_id} style={isSelected(p) ? styles.trSelected : {}}>
                    <td style={styles.td}><input type={selectionType === 'multiple' ? 'checkbox' : 'radio'} name={`selection-${selectionType}`} value={JSON.stringify(p)} checked={isSelected(p)} onChange={(e) => onSelect(e.target.value)} /></td>
                    <td style={styles.td}>{new Date(p.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                    <td style={styles.td}>{p.numero_pedido_loja}</td>
                    <td style={styles.td}>{p.empresa}</td>
                </tr>))}
            </tbody>
        </table></div>
    );
};

function ImportarEtiquetaManual() {
    const [pedidosPendentes, setPedidosPendentes] = useState<Pedido[]>([]);
    const [pedidosProntos, setPedidosProntos] = useState<Pedido[]>([]);
    const [selecaoPasso1, setSelecaoPasso1] = useState({ pedido: '', formato: 'PDF' as 'PDF' | 'ZPL' });
    const [selecoesPasso2, setSelecoesPasso2] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [feedback, setFeedback] = useState('Carregando listas de pedidos...');
    const API_URL = 'http://localhost:3001';

    const fetchAllPedidos = async () => { setIsLoading(true); try { const [pendentesRes, prontosRes] = await Promise.all([ fetch(`${API_URL}/api/etiquetas/pendentes`), fetch(`${API_URL}/api/etiquetas/prontas-para-geracao`) ]); if (!pendentesRes.ok || !prontosRes.ok) throw new Error('Falha ao comunicar com o servidor.'); setPedidosPendentes(await pendentesRes.json()); setPedidosProntos(await prontosRes.json()); } catch (e: any) { setFeedback(`❌ Erro ao carregar listas: ${e.message}`); } finally { setIsLoading(false); } };
    useEffect(() => { fetchAllPedidos().then(() => setFeedback('Listas carregadas. Selecione uma ação para começar.')); }, []);
    
    const handleProcessarEtiqueta = async () => { if (!selecaoPasso1.pedido) { alert('Selecione um pedido pendente.'); return; } const pedidoObj = JSON.parse(selecaoPasso1.pedido); setIsLoading(true); setFeedback(`Passo 1: Baixando etiqueta para ${pedidoObj.numero_pedido_loja}...`); try { const response = await fetch(`${API_URL}/api/etiquetas/processar-transporte`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...pedidoObj, formato: selecaoPasso1.formato }) }); const resJson = await response.json(); if (!response.ok) throw new Error(resJson.message); await fetchAllPedidos(); setSelecaoPasso1({ ...selecaoPasso1, pedido: '' }); setSelecoesPasso2([]); setFeedback(`✅ Passo 1 concluído: ${resJson.message} Listas atualizadas!`); } catch (error: any) { setFeedback(`❌ Erro no Passo 1: ${error.message}`); } finally { setIsLoading(false); } };
    const handleSelecaoPasso2 = (pedidoJson: string) => { setSelecoesPasso2(prev => prev.includes(pedidoJson) ? prev.filter(p => p !== pedidoJson) : [...prev, pedidoJson]); };
    
    const handleFileResponse = async (response: Response, defaultFilename: string) => { if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.message || 'Erro do servidor.'); } const blob = await response.blob(); const url = window.URL.createObjectURL(blob); const a = document.createElement('a'); a.style.display = 'none'; a.href = url; const disposition = response.headers.get('content-disposition'); let filename = defaultFilename; if (disposition && disposition.includes('attachment')) { const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/; const matches = filenameRegex.exec(disposition); if (matches?.[1]) { filename = matches[1].replace(/['"]/g, ''); } } a.download = filename; document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url); a.remove(); };
    
    const handleGerarRomaneio = async () => { if (selecoesPasso2.length !== 1) { alert('Selecione exatamente UM pedido.'); return; } const pedidoObj = JSON.parse(selecoesPasso2[0]); setIsLoading(true); setFeedback(`Gerando PDF para ${pedidoObj.numero_pedido_loja}...`); try { const response = await fetch(`${API_URL}/api/etiquetas/gerar-romaneio`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ numero_pedido_loja: pedidoObj.numero_pedido_loja }) }); if (!response.ok) throw new Error((await response.json()).message || 'Erro.'); const blob = await response.blob(); window.open(window.URL.createObjectURL(blob), '_blank'); setFeedback(`✅ PDF para ${pedidoObj.numero_pedido_loja} gerado!`); } catch (error: any) { setFeedback(`❌ Erro ao gerar PDF: ${error.message}`); } finally { setIsLoading(false); } };
    
    // --- FUNÇÃO AJUSTADA: Chama a nova rota para preparar o ZPL no servidor ---
    const handlePrepararZpl = async () => {
        if (selecoesPasso2.length !== 1) { alert('Selecione exatamente UM pedido para preparar o ZPL.'); return; }
        const pedidoObj = JSON.parse(selecoesPasso2[0]); setIsLoading(true); setFeedback(`Preparando arquivo ZPL para ${pedidoObj.numero_pedido_loja} no servidor...`);
        try {
            const response = await fetch(`${API_URL}/api/etiquetas/preparar-zpl-individual`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ numero_pedido_loja: pedidoObj.numero_pedido_loja }) });
            const resJson = await response.json();
            if (!response.ok) throw new Error(resJson.message || 'Erro do servidor.');
            setFeedback(`✅ ${resJson.message}`);
        } catch (error: any) { setFeedback(`❌ Erro ao preparar ZPL: ${error.message}`); } finally { setIsLoading(false); }
    };
    
    const handleGerarLotePdf = async () => { if (selecoesPasso2.length === 0) { alert('Selecione pelo menos UM pedido.'); return; } setIsLoading(true); setFeedback(`Gerando lote PDF para ${selecoesPasso2.length} pedido(s)...`); try { const numeros_pedido_loja = selecoesPasso2.map(p => JSON.parse(p).numero_pedido_loja); const response = await fetch(`${API_URL}/api/etiquetas/gerar-lote`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ numeros_pedido_loja }) }); if (!response.ok) throw new Error((await response.json()).message || 'Erro.'); const blob = await response.blob(); window.open(window.URL.createObjectURL(blob), '_blank'); setFeedback(`✅ Lote PDF com ${selecoesPasso2.length} etiqueta(s) gerado!`); setSelecoesPasso2([]); } catch (error: any) { setFeedback(`❌ Erro ao gerar Lote PDF: ${error.message}`); } finally { setIsLoading(false); } };
    
    // --- NOVA FUNÇÃO: Para baixar o lote de arquivos ZPL já preparados ---
    const handleGerarLoteZpl = async () => {
        if (selecoesPasso2.length === 0) { alert('Selecione pelo menos UM pedido para incluir no lote ZPL.'); return; }
        setIsLoading(true); setFeedback(`Baixando lote ZPL para ${selecoesPasso2.length} pedido(s)...`);
        try {
            const numeros_pedido_loja = selecoesPasso2.map(p => JSON.parse(p).numero_pedido_loja);
            const response = await fetch(`${API_URL}/api/etiquetas/gerar-lote-zpl`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ numeros_pedido_loja }) });
            await handleFileResponse(response, 'lote_etiquetas.zpl');
            setFeedback(`✅ Lote ZPL com ${selecoesPasso2.length} etiqueta(s) baixado!`);
            setSelecoesPasso2([]);
        } catch (error: any) { setFeedback(`❌ Erro ao baixar Lote ZPL: ${error.message}`); } finally { setIsLoading(false); }
    };

    return (
        <div style={styles.container}>
            <style>{keyframes}</style>
            <h1>Geração de Etiqueta e Romaneio</h1>

            <div style={styles.frame}>
                <h2>Passo 1: Baixar Etiqueta de Transporte do Bling</h2>
                <PedidosTable pedidos={pedidosPendentes} selection={selecaoPasso1.pedido} onSelect={(value) => setSelecaoPasso1({...selecaoPasso1, pedido: value})} isLoading={isLoading} selectionType="single" />
                <div style={styles.controlsContainer}>
                    <div style={styles.controlGroup}>
                        <label style={styles.label}>Formato de Download:</label>
                        <select style={styles.select} value={selecaoPasso1.formato} onChange={e => setSelecaoPasso1({...selecaoPasso1, formato: e.target.value as 'PDF'|'ZPL'})} disabled={isLoading || !selecaoPasso1.pedido}>
                            <option value="PDF">PDF (Marketplaces, etc)</option>
                            <option value="ZPL">ZPL (Transportadoras)</option>
                        </select>
                    </div>
                    <div>
                        <button onClick={handleProcessarEtiqueta} disabled={isLoading || !selecaoPasso1.pedido} style={{ ...styles.button, ...styles.buttonBlue, ...((isLoading || !selecaoPasso1.pedido) && styles.buttonDisabled) }}>
                            {isLoading && selecaoPasso1.pedido ? <><div style={styles.spinner}></div> Processando...</> : 'Processar Etiqueta'}
                        </button>
                    </div>
                </div>
            </div>

            <div style={styles.frame}>
                <h2>Passo 2: Gerar Arquivos Finais</h2>
                <p>Selecione os pedidos da lista abaixo.</p>
                <PedidosTable pedidos={pedidosProntos} selection={selecoesPasso2} onSelect={handleSelecaoPasso2} isLoading={isLoading} selectionType="multiple" />
                <div style={styles.controlsContainer}>
                    <button onClick={handleGerarRomaneio} disabled={isLoading || selecoesPasso2.length !== 1} style={{ ...styles.button, ...styles.buttonPurple, ...((isLoading || selecoesPasso2.length !== 1) && styles.buttonDisabled) }}> Gerar PDF (1) </button>
                </div>
            </div>

            <div>
                <h2>Feedback da Ação</h2>
                <div style={styles.logBox}>{feedback}</div>
            </div>
        </div>
    );
}

export default ImportarEtiquetaManual;