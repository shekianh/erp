import React, { useState, useRef, useEffect } from 'react';

// --- ESTILOS ---
const styles: { [key: string]: React.CSSProperties } = {
    container: { fontFamily: 'sans-serif', padding: '20px', maxWidth: '1000px', margin: '0 auto' },
    frame: { border: '1px solid #ccc', borderRadius: '8px', padding: '20px', marginBottom: '25px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' },
    label: { marginRight: '10px', fontWeight: 'bold' },
    input: { padding: '8px', border: '1px solid #ccc', borderRadius: '4px', marginRight: '20px' },
    button: { padding: '10px 20px', fontSize: '15px', cursor: 'pointer', border: 'none', borderRadius: '5px', margin: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', transition: 'background-color 0.2s' },
    buttonBlue: { backgroundColor: '#007bff', color: 'white' },
    buttonGreen: { backgroundColor: '#28a745', color: 'white' },
    buttonRed: { backgroundColor: '#dc3545', color: 'white' },
    buttonDisabled: { backgroundColor: '#aaa', cursor: 'not-allowed' },
    logBox: { background: '#2d2d2d', color: '#f8f8f2', padding: '15px', height: '300px', overflowY: 'auto', whiteSpace: 'pre-wrap', wordWrap: 'break-word', borderRadius: '5px', fontSize: '14px', marginTop: '10px' },
    processControl: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', borderBottom: '1px solid #eee' },
    spinner: { border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', width: '16px', height: '16px', animation: 'spin 1s linear infinite', marginRight: '8px' },
    // Estilos para a nova barra de progresso
    progressBarContainer: { width: '100%', backgroundColor: '#e0e0e0', borderRadius: '4px', marginTop: '15px', height: '25px', overflow: 'hidden' },
    progressBar: { height: '100%', backgroundColor: '#007bff', width: '0%', transition: 'width 0.2s ease-in-out', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' },
};
const keyframes = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;

function ImportacaoManual() {
    // Estados para importação manual
    const [dataInicial, setDataInicial] = useState(new Date().toISOString().split('T')[0]);
    const [dataFinal, setDataFinal] = useState(new Date().toISOString().split('T')[0]);
    
    // Estados para controle dos loops
    const [loopStatus, setLoopStatus] = useState<{ [key: string]: boolean }>({ etiquetas: false, pedidos: false, nfe: false });
    const [isLoadingLoop, setIsLoadingLoop] = useState(false);

    // Estados para logs e carregamento geral
    const [logs, setLogs] = useState(['Aguardando comando...']);
    const [isLoadingManual, setIsLoadingManual] = useState(false);
    const [progress, setProgress] = useState(0); // NOVO ESTADO: Armazena o progresso (0 a 100)
    
    const eventSourceRef = useRef<EventSource | null>(null);
    const logBoxRef = useRef<HTMLPreElement>(null);

    useEffect(() => {
        const fetchStatus = async () => { try { const response = await fetch('http://localhost:3001/api/processos/status'); const data = await response.json(); setLoopStatus(data); } catch (error) { console.error("Erro ao buscar status dos processos:", error); } };
        fetchStatus();
    }, []);

    useEffect(() => { if (logBoxRef.current) { logBoxRef.current.scrollTop = logBoxRef.current.scrollHeight; } }, [logs]);

    const adicionarLog = (mensagem: string) => {
        const timestamp = `[${new Date().toLocaleTimeString()}]`;
        setLogs(logsAnteriores => [...logsAnteriores, `${timestamp} ${mensagem}`]);
    };

    const iniciarProcessoStreaming = (url: string) => {
        setIsLoadingManual(true);
        setProgress(0); // Reseta o progresso ao iniciar um novo processo
        setLogs(['Iniciando conexão com o servidor...']);
        
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        const eventSource = new EventSource(url);
        eventSourceRef.current = eventSource;

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                // NOVO: Verifica o tipo de mensagem recebida do servidor
                if (data.type === 'progress') {
                    setProgress(data.value); // Atualiza o estado do progresso
                } else if (data.type === 'log') {
                    adicionarLog(data.message); // Adiciona a mensagem aos logs
                } else if (data.message === '__END__') {
                    adicionarLog("✅ Processo finalizado pelo servidor.");
                    setProgress(100); // Garante que a barra chegue a 100%
                    eventSource.close();
                    setIsLoadingManual(false);
                }

            } catch (error) {
                // Ignora mensagens que não são JSON, como o 'keep-alive' do servidor
                // ou a mensagem final que pode não ser JSON
                if (event.data === '__END__') {
                     adicionarLog("✅ Processo finalizado pelo servidor.");
                     setProgress(100);
                     eventSource.close();
                     setIsLoadingManual(false);
                } else {
                    console.warn("Recebido dado não-JSON do servidor (provavelmente um keep-alive):", event.data);
                }
            }
        };

        eventSource.onerror = () => {
            adicionarLog("🔌 Conexão com o servidor fechada ou ocorreu um erro.");
            setIsLoadingManual(false);
            eventSource.close();
        };
    };

    const handleImportarPedidos = () => {
        const params = new URLSearchParams({ dataInicial, dataFinal });
        iniciarProcessoStreaming(`http://localhost:3001/api/importar/pedidos?${params.toString()}`);
    };

    const handleImportarNFe = () => {
        const params = new URLSearchParams({ dataInicial, dataFinal });
        iniciarProcessoStreaming(`http://localhost:3001/api/importar/nfe?${params.toString()}`);
    };

    const handleControlLoop = async (nomeProcesso: string, action: 'iniciar' | 'parar') => {
        setIsLoadingLoop(true);
        adicionarLog(`Tentando ${action} o processo de ${nomeProcesso}...`);
        try {
            const response = await fetch(`http://localhost:3001/api/processos/${nomeProcesso}/${action}`, { method: 'POST' });
            const resJson = await response.json();
            if (!response.ok) throw new Error(resJson.message);
            adicionarLog(resJson.message);
            setLoopStatus(prev => ({ ...prev, [nomeProcesso]: action === 'iniciar' }));
        } catch (error: any) {
            adicionarLog(`Erro: ${error.message}`);
        } finally {
            setIsLoadingLoop(false);
        }
    };

    return (
        <div style={styles.container}>
            <style>{keyframes}</style>
            <h1>Painel de Controle e Importação</h1>

            <div style={styles.frame}>
                <h2>Controle dos Processos Automáticos (Loops)</h2>
                {Object.keys(loopStatus).map((nome) => (
                    <div key={nome} style={styles.processControl}>
                        <span style={{textTransform: 'capitalize'}}>Processo de {nome}: <strong>{loopStatus[nome] ? 'Rodando' : 'Parado'}</strong></span>
                        <button onClick={() => handleControlLoop(nome, loopStatus[nome] ? 'parar' : 'iniciar')} disabled={isLoadingLoop} style={{...styles.button, ...(loopStatus[nome] ? styles.buttonRed : styles.buttonGreen), ...(isLoadingLoop && styles.buttonDisabled)}}>
                            {isLoadingLoop && <div style={styles.spinner}></div>}
                            {loopStatus[nome] ? 'Parar' : 'Iniciar'}
                        </button>
                    </div>
                ))}
            </div>

            <div style={styles.frame}>
                <h2>Importação Manual por Período</h2>
                <label style={styles.label}>Data Inicial:</label>
                <input type="date" style={styles.input} value={dataInicial} onChange={e => setDataInicial(e.target.value)} disabled={isLoadingManual} />
                <label style={styles.label}>Data Final:</label>
                <input type="date" style={styles.input} value={dataFinal} onChange={e => setDataFinal(e.target.value)} disabled={isLoadingManual} />
                <br /><br />
                <button onClick={handleImportarPedidos} disabled={isLoadingManual} style={{ ...styles.button, ...styles.buttonBlue, ...(isLoadingManual && styles.buttonDisabled) }}>
                    {isLoadingManual ? <><div style={styles.spinner}></div> Processando...</> : 'Importar Pedidos'}
                </button>
                <button onClick={handleImportarNFe} disabled={isLoadingManual} style={{ ...styles.button, ...styles.buttonBlue, ...(isLoadingManual && styles.buttonDisabled) }}>
                    {isLoadingManual ? <><div style={styles.spinner}></div> Processando...</> : 'Importar NFe'}
                </button>

                {/* --- NOVA BARRA DE PROGRESSO --- */}
                {isLoadingManual && (
                    <div style={styles.progressBarContainer}>
                        <div style={{ ...styles.progressBar, width: `${progress}%` }}>
                            {progress.toFixed(0)}%
                        </div>
                    </div>
                )}
            </div>

            <div>
                <h2>Logs de Ação</h2>
                <pre ref={logBoxRef} style={styles.logBox}>{logs.join('\n')}</pre>
            </div>
        </div>
    );
}
export default ImportacaoManual;