import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import { promises as fsPromises } from 'fs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import AdmZip from 'adm-zip';
import { PDFDocument } from 'pdf-lib';
import bwipjs from 'bwip-js';
import PDFKitDocument from 'pdfkit';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let pdf;

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';
const ETIQUETAS_BASE_PATH = path.join(__dirname, '..', 'etiquetas_salvas');
const PDF_GERADOS_PATH = path.join(__dirname, '..', 'pdf_gerados');
const ETIQUETAS_IMAGENS_PATH = path.join(__dirname, '..', 'etiquetas_imagens_processadas');
const ETIQUETAS_ZPL_GERADO_PATH = path.join(__dirname, '..', 'etiquetas_zpl_gerado');

const TABELA_CONTAS = 'Bling_contas';
const TABELA_PEDIDOS = 'pedido_vendas';
const TABELA_ITENS = 'item_pedido_vendas';
const TABELA_NOTAS_FISCAIS = 'nota_fiscal';
const TABELA_ETIQUETAS_ENVIO = 'etiquetas_envio_dados';
const TABELA_LOGO = 'logo';
const TABELA_ITENS_PEDIDO = 'item_pedido_vendas';

const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

const BLING_API_DELAY_MS = 1000;
const printQueue = [];

const CONFIG_LOJAS = {
    '204978475': { fatorAmpliacaoTransporte: 1.02, fatorRedimensionamentoZpl: 0.90 },
    '203944379': { fatorAmpliacaoTransporte: 1.08, fatorRedimensionamentoZpl: 0.95 },
    '203614110': { fatorAmpliacaoTransporte: 1.02, fatorRedimensionamentoZpl: 0.90 },
};

const FATOR_AMPLIACAO_PADRAO = 1.08;
const FATOR_REDIMENSIONAMENTO_ZPL_PADRAO = 0.98;

const AUTO_START_LOOPS = {
    pedidos: false,
    nfe: false,
    etiquetas: false
};

let lojaFormatoConfig = {};
try {
    const formatoJsonPath = path.join(__dirname, 'formato.json');
    if (fs.existsSync(formatoJsonPath)) {
        const rawData = fs.readFileSync(formatoJsonPath);
        const configArray = JSON.parse(rawData);
        lojaFormatoConfig = configArray.reduce((acc, loja) => {
            acc[loja.loja_id] = loja.formato;
            return acc;
        }, {});
        console.log('[SYSTEM] Configuração de formato das lojas carregada.');
    } else {
        console.warn('[SYSTEM] Arquivo formato.json não encontrado. Usando PDF como padrão.');
    }
} catch (error) {
    console.warn('[SYSTEM] Erro ao carregar formato.json:', error.message);
}

app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));
app.use(compression());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { error: 'Muitas requisições deste IP, tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173',
      'http://192.168.1.80:5173',
      'https://erp.shekinahcalcados.com.br',
      'https://www.erp.shekinahcalcados.com.br',
      'http://erp.shekinahcalcados.com.br'
    ];

    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Não permitido pelo CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Disposition']
};
app.use(cors(corsOptions));

app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const retryableAxiosPost = async (url, data, config, maxRetries = 3, baseDelay = 3000) => {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            if (attempt > 0) {
                const waitTime = baseDelay * Math.pow(2, attempt - 1);
                console.warn(`[RETRY] Tentativa ${attempt + 1}. Aguardando ${waitTime / 1000}s...`);
                await delay(waitTime);
            }
            return await axios.post(url, data, config);
        } catch (error) {
            const isRetryable = error.response && (error.response.status === 429 || error.response.status >= 500);
            if (isRetryable && attempt < maxRetries - 1) {
                console.warn(`[RETRY] Requisição falhou com status ${error.response.status}.`);
            } else {
                console.error(`[RETRY] Falha após ${maxRetries} tentativas.`);
                throw error;
            }
        }
    }
    throw new Error('Falha na requisição.');
};

const convertPdfToJpg = async (pdfPath, outputPath) => {
    try {
        console.log(`   [PDF->JPG] Convertendo ${pdfPath} para JPG...`);
        const fileBuffer = await fsPromises.readFile(pdfPath);
        const document = await pdf(fileBuffer, { scale: 3 });

        for await (const pageImageBuffer of document) {
            const outputFileName = `${path.parse(pdfPath).name}.jpg`;
            const finalImagePath = path.join(outputPath, outputFileName);
            await sharp(pageImageBuffer).rotate(-90).toFile(finalImagePath);
            console.log(`   [PDF->JPG] ✅ JPG rotacionado e salvo em: ${finalImagePath}`);
            return finalImagePath;
        }
        throw new Error("O documento PDF está vazio ou não pôde ser processado.");
    } catch (error) {
        console.error(`   [PDF->JPG] ❌ Erro na conversão:`, error.message || error);
        throw error;
    }
};

const convertJpgToZpl = async (jpgPath, lojaId) => {
    try {
        console.log(`   [JPG->ZPL] Convertendo ${path.basename(jpgPath)} para ZPL...`);
        const fator = CONFIG_LOJAS[String(lojaId)]?.fatorRedimensionamentoZpl ?? FATOR_REDIMENSIONAMENTO_ZPL_PADRAO;

        const image = sharp(jpgPath);
        const metadata = await image.metadata();
        const newWidth = Math.round(metadata.width * fator);
        const newHeight = Math.round(metadata.height * fator);

        const { data, info } = await image
            .resize(newWidth, newHeight)
            .greyscale()
            .raw()
            .toBuffer({ resolveWithObject: true });

        const width = info.width;
        const height = info.height;
        const bytesPerRow = Math.ceil(width / 8);
        const totalBytes = bytesPerRow * height;
        const zplBitmap = Buffer.alloc(totalBytes);
        let byteIndex = 0;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x += 8) {
                let currentByte = 0;
                for (let b = 0; b < 8; b++) {
                    currentByte <<= 1;
                    const pixelIndex = (y * width) + x + b;
                    if (pixelIndex < data.length && data[pixelIndex] < 128) {
                        currentByte |= 1;
                    }
                }
                zplBitmap[byteIndex++] = currentByte;
            }
        }

        const hexData = zplBitmap.toString('hex').toUpperCase();
        const zplCode = `^XA^FO0,0^GFA,${totalBytes},${totalBytes},${bytesPerRow},${hexData}^FS^XZ`;

        const outputFileName = `${path.parse(jpgPath).name}.zpl`;
        const lojaIdSubDir = path.basename(path.dirname(jpgPath));
        const outputDir = path.join(ETIQUETAS_ZPL_GERADO_PATH, lojaIdSubDir);
        await fsPromises.mkdir(outputDir, { recursive: true });

        const zplPath = path.join(outputDir, outputFileName);
        await fsPromises.writeFile(zplPath, zplCode);
        console.log(`   [JPG->ZPL] ✅ ZPL salvo em: ${zplPath}`);
        return zplPath;
    } catch (error) {
        console.error(`   [JPG->ZPL] ❌ Erro na conversão para ZPL:`, error.message || error);
        throw error;
    }
};

const convertZplToPdf = async (zplCode) => {
    console.log("   [ZPL->PDF] Solicitando imagem PNG da API Labelary...");
    const labelaryResponse = await retryableAxiosPost('http://api.labelary.com/v1/printers/8dpmm/labels/4x6/0/', zplCode, { headers: { 'Accept': 'image/png' }, responseType: 'arraybuffer' });
    const contrastedImageBuffer = await sharp(labelaryResponse.data).threshold(128).toBuffer();
    const imageMetadata = await sharp(contrastedImageBuffer).metadata();
    const finalPdfDoc = await PDFDocument.create();
    const page = finalPdfDoc.addPage([imageMetadata.width, imageMetadata.height]);
    const pngImage = await finalPdfDoc.embedPng(contrastedImageBuffer);
    page.drawImage(pngImage, { x: 0, y: 0, width: imageMetadata.width, height: imageMetadata.height });
    return await finalPdfDoc.save();
};

const salvarPdfMescladoEConverter = async (pdfBytes, lojaId, numeroPedidoLoja) => {
    try {
        const pastaPdfGerados = path.join(PDF_GERADOS_PATH, String(lojaId));
        await fsPromises.mkdir(pastaPdfGerados, { recursive: true });

        const pdfPath = path.join(pastaPdfGerados, `${numeroPedidoLoja}.pdf`);
        await fsPromises.writeFile(pdfPath, pdfBytes);

        const jpgPath = await convertPdfToJpg(pdfPath, pastaPdfGerados);
        const zplPath = await convertJpgToZpl(jpgPath, lojaId);

        return { pdfPath, jpgPath, zplPath, success: true };
    } catch (error) {
        console.error(`[PDF_MESCLADO] ❌ Erro ao processar ${numeroPedidoLoja}:`, error.message);
        throw error;
    }
};

async function createPackingSlipContent(doc, orderData, items, logoBase64) {
    const PAGE_WIDTH = 212.6, PAGE_HEIGHT = 283.46, MARGIN = 10;
    let y = MARGIN;
    if (logoBase64) {
        try {
            doc.image(Buffer.from(logoBase64, 'base64'), MARGIN, y, { width: 80 });
        } catch (e) {
            console.error("Erro ao processar logo.");
        }
    }
    doc.font("Helvetica-Bold").fontSize(12);
    const nfText = `NF: ${(orderData.numero_nf || 'N/A')} - Serie: ${(orderData.serie || 'N/A')}`;
    doc.text(nfText, PAGE_WIDTH - doc.widthOfString(nfText) - MARGIN, y + 1);
    doc.font("Helvetica").fontSize(12);
    const dataEmissao = orderData.data_emissao ? new Date(orderData.data_emissao).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'UTC' }) : 'N/A';
    doc.text(dataEmissao, PAGE_WIDTH - doc.widthOfString(dataEmissao) - MARGIN, y + 14);
    y += 25;

    if (orderData.chave_acesso) {
        try {
            const pngBuffer = await bwipjs.toBuffer({ bcid: 'code128', text: orderData.chave_acesso, scale: 3, height: 6, includetext: false });
            doc.image(pngBuffer, MARGIN, y, { width: PAGE_WIDTH - MARGIN * 2, height: 16 });
            y += 18;
            doc.font("Helvetica").fontSize(6.5);
            const chaveAcessoFormatada = orderData.chave_acesso.replace(/(\d{4})/g, '$1 ').trim();
            doc.text(chaveAcessoFormatada, MARGIN, y, { align: 'center' });
            y += 8;
        } catch (err) {
            y += 8;
        }
    }

    doc.font('Helvetica-Bold').fontSize(7.5).text('CLIENTE: ', MARGIN, y, { continued: true }).font('Helvetica').text((orderData.contato_nome || 'N/A').toUpperCase());
    y += 8;

    const addressParts = [orderData.etiqueta_endereco, orderData.etiqueta_numero || 'S/N', orderData.etiqueta_bairro, orderData.etiqueta_complemento].filter(Boolean);
    doc.text(`END: ${addressParts.join(', ')}`, MARGIN, y);
    y += 18;

    const cityParts = [orderData.etiqueta_municipio, orderData.etiqueta_uf].filter(Boolean);
    doc.text(`${cityParts.join('-')} CEP: ${orderData.etiqueta_cep || ''}`, MARGIN, y);
    y += 8;

    doc.font('Helvetica-Bold').fontSize(9).text('PEDIDO: ', MARGIN, y, { continued: true }).text((orderData.numero_pedido_loja || '').toUpperCase());
    y += 8;

    doc.moveTo(MARGIN, y).lineTo(PAGE_WIDTH - MARGIN, y).strokeColor("#000000ff").stroke();
    y += 2;

    doc.font("Helvetica-Bold").fontSize(12);
    doc.text("SKU", MARGIN, y);
    doc.text("QTD", PAGE_WIDTH - MARGIN - 30, y);
    y += 15;

    const sortedItems = [...(items || [])].sort((a, b) => (a.item_codigo || '').localeCompare(b.item_codigo || ''));

    if (sortedItems.length > 6) {
        y += 20;
        doc.font("Helvetica-Bold").fontSize(14);
        doc.text("VERIFICAR ITENS E QUANTIDADES NO PEDIDO", MARGIN, y, {
            align: 'center',
            width: PAGE_WIDTH - MARGIN * 2
        });
    } else {
        sortedItems.forEach(item => {
            if (y > PAGE_HEIGHT - 30) return;
            const initialY = y;
            const itemQty = parseInt(item.item_quantidade || 0, 10);
            const QTD_COLUMN_X = PAGE_WIDTH - MARGIN - 30;
            doc.font("Helvetica-Bold").fontSize(22)
               .text((item.item_codigo || '').toUpperCase(), MARGIN, initialY, { width: PAGE_WIDTH - MARGIN * 2 - 35 });

            if (itemQty >= 2) {
                const squareSize = 22;
                const textYOffset = 4;
                doc.rect(QTD_COLUMN_X, initialY, squareSize, squareSize).fill('black');
                doc.fillColor('white')
                   .font("Helvetica-Bold")
                   .fontSize(22)
                   .text(String(itemQty), QTD_COLUMN_X, initialY + textYOffset, { width: squareSize, align: 'center' });
                doc.fillColor('black');
            } else {
                doc.font("Helvetica-Bold").fontSize(22)
                   .text(String(itemQty), QTD_COLUMN_X, initialY, { width: 25, align: 'center' });
            }
            y = doc.y + 5;
        });
    }
}

const generateSingleLabelPdf = async (numero_pedido_loja) => {
    try {
        const [nfRes, pedidoRes, itensRes, logoRes, etiquetaInfoRes] = await Promise.all([
            supabase.from(TABELA_NOTAS_FISCAIS).select('*').eq('numero_pedido_loja', numero_pedido_loja).single(),
            supabase.from(TABELA_PEDIDOS).select('*').eq('numero_pedido_loja', numero_pedido_loja).single(),
            supabase.from(TABELA_ITENS).select('item_codigo, item_quantidade').eq('numero_pedido_loja', numero_pedido_loja),
            supabase.from(TABELA_LOGO).select('base64').eq('logo', 'shekinah').single(),
            supabase.from(TABELA_ETIQUETAS_ENVIO).select('loja_id').eq('numero_pedido_loja', numero_pedido_loja).single()
        ]);

        if (pedidoRes.error) throw new Error(`Pedido ${numero_pedido_loja} não encontrado.`);
        if (itensRes.error || !itensRes.data?.length) throw new Error(`Nenhum item encontrado para o pedido ${numero_pedido_loja}.`);
        if (logoRes.error) throw new Error(`Logo não encontrado.`);
        if (etiquetaInfoRes.error) throw new Error(`Dados da etiqueta para ${numero_pedido_loja} não encontrados.`);

        const lojaId = etiquetaInfoRes.data.loja_id;
        const fatorAmpliacaoTransporte = CONFIG_LOJAS[String(lojaId)]?.fatorAmpliacaoTransporte ?? FATOR_AMPLIACAO_PADRAO;
        const caminhoPdfTransporte = path.join(ETIQUETAS_BASE_PATH, String(lojaId), `${numero_pedido_loja}_transporte.pdf`);

        if (!fs.existsSync(caminhoPdfTransporte)) {
            throw new Error(`Arquivo de transporte não encontrado: ${caminhoPdfTransporte}`);
        }

        const pdfTransporteBytes = await fsPromises.readFile(caminhoPdfTransporte);
        const romaneioBytes = await new Promise(async (resolve, reject) => {
            try {
                const doc = new PDFKitDocument({ size: [212.6, 283.46], margins: { top: 0, left: 0, bottom: 0, right: 0 } });
                const buffers = [];
                doc.on('data', buffers.push.bind(buffers));
                doc.on('end', () => resolve(Buffer.concat(buffers)));
                await createPackingSlipContent(doc, { ...(nfRes.data || {}), ...pedidoRes.data }, itensRes.data, logoRes.data?.base64);
                doc.end();
            } catch (error) {
                reject(error);
            }
        });

        const pdfFinal = await PDFDocument.create();
        const [romaneioPage] = await pdfFinal.embedPages((await PDFDocument.load(romaneioBytes)).getPages());
        const [transportePage] = await pdfFinal.embedPages((await PDFDocument.load(pdfTransporteBytes)).getPages());
        const PAGE_WIDTH = 425.20;
        const PAGE_HEIGHT = 283.46;
        const finalPage = pdfFinal.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        finalPage.drawPage(romaneioPage, { width: PAGE_WIDTH / 2, height: PAGE_HEIGHT, x: 0, y: 0 });
        const transporteWidth = (PAGE_WIDTH / 2) * fatorAmpliacaoTransporte;
        const transporteHeight = PAGE_HEIGHT * fatorAmpliacaoTransporte;
        finalPage.drawPage(transportePage, {
            width: transporteWidth,
            height: transporteHeight,
            x: (PAGE_WIDTH / 2) - ((transporteWidth - (PAGE_WIDTH / 2)) / 2),
            y: (PAGE_HEIGHT - transporteHeight) / 2
        });

        const pdfBytes = await pdfFinal.save();
        await salvarPdfMescladoEConverter(pdfBytes, lojaId, numero_pedido_loja);
        return pdfBytes;
    } catch (e) {
        console.error(`[GERADOR] ❌ ERRO FATAL para ${numero_pedido_loja}:`, e.message);
        throw e;
    }
};

const processarESalvarEtiqueta = async (pedidoId, lojaId, numeroPedidoLoja, etiquetaInfo) => {
    const response = await axios({ method: 'get', url: etiquetaInfo.link, responseType: 'arraybuffer' });
    const pastaLoja = path.join(ETIQUETAS_BASE_PATH, String(lojaId));
    await fsPromises.mkdir(pastaLoja, { recursive: true });
    const caminhoFinalPdf = path.join(pastaLoja, `${numeroPedidoLoja}_transporte.pdf`);
    let pdfBytes;

    if (etiquetaInfo.link.toLowerCase().includes('.zip')) {
        const zip = new AdmZip(response.data);
        const zplEntry = zip.getEntries().find(e => !e.isDirectory && (e.entryName.toLowerCase().endsWith('.zpl') || e.entryName.toLowerCase().endsWith('.txt')));
        if (!zplEntry) throw new Error('Arquivo ZPL/TXT não encontrado no ZIP.');
        pdfBytes = await convertZplToPdf(zplEntry.getData().toString('utf-8'));
    } else if (etiquetaInfo.link.toLowerCase().includes('.pdf')) {
        pdfBytes = response.data;
    } else {
        throw new Error("Formato de etiqueta não suportado.");
    }

    await fsPromises.writeFile(caminhoFinalPdf, pdfBytes);
    await supabase.from(TABELA_ETIQUETAS_ENVIO).update({
        situacao_baixada: 'pdf transporte salvo',
        erro: null,
        id_etq: etiquetaInfo.id,
        link: etiquetaInfo.link
    }).eq('pedido_id', pedidoId);
};

const getContas = async () => {
    const { data, error } = await supabase.from(TABELA_CONTAS).select("empresa, token");
    if (error) throw new Error("Não foi possível buscar as contas.");
    return data;
};

const fetchPaginatedData = async (token, endpoint, params, logger) => {
    let allData = [], currentPage = 1;
    const axiosInstance = axios.create({
        baseURL: 'https://api.bling.com.br/Api/v3/',
        headers: { 'Authorization': `Bearer ${token}` }
    });

    while (true) {
        try {
            await delay(BLING_API_DELAY_MS);
            const response = await axiosInstance.get(endpoint, {
                params: { ...params, pagina: currentPage, limite: 100 }
            });
            if (!response.data.data?.length) break;
            allData.push(...response.data.data);
            if (logger) logger(` -> Página ${currentPage} de '${endpoint}' carregada.`);
            currentPage++;
        } catch (e) {
            if (logger) logger(`❌ Erro na página ${currentPage}: ${e.message}`);
            break;
        }
    }
    return allData;
};

const getDetalhes = async (token, endpoint, id, logger) => {
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            await delay(BLING_API_DELAY_MS);
            return (await axios.get(`https://api.bling.com.br/Api/v3/${endpoint}/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })).data.data;
        } catch (e) {
            if (e.response?.status === 404) {
                if (logger) logger(` -> ID ${id} não encontrado.`);
                return null;
            }
            if (logger) logger(` -> Tentativa ${attempt + 1} para buscar ID ${id} falhou.`);
            if (attempt < 2) await delay(1500);
        }
    }
    return null;
};

const baixarEtiquetaBling = async (token, vendaId, lojaId) => {
    try {
        const formatoEtiqueta = lojaFormatoConfig[lojaId] || 'PDF';
        await delay(BLING_API_DELAY_MS);
        const response = await axios.get('https://api.bling.com.br/Api/v3/logisticas/etiquetas', {
            headers: { 'Authorization': `bearer ${token}` },
            params: { 'idsVendas[]': vendaId, 'formato': formatoEtiqueta }
        });
        return response.data;
    } catch(e) {
        if (e.response?.status === 404) return null;
        throw new Error(`Falha API Bling p/ ID ${vendaId}: ${e.response ? JSON.stringify(e.response.data) : e.message}`);
    }
};

const processarEtiquetaCompletaImediatamente = async (token, pedidoId, empresa, logger) => {
    try {
        const { data: etiquetaInfo, error: etiquetaError } = await supabase
            .from(TABELA_ETIQUETAS_ENVIO).select('loja_id, numero_pedido_loja').eq('pedido_id', pedidoId).single();
        if (etiquetaError || !etiquetaInfo) throw new Error(`Dados da etiqueta para o pedido ${pedidoId} não encontrados.`);

        const { loja_id, numero_pedido_loja } = etiquetaInfo;
        const respBling = await baixarEtiquetaBling(token, pedidoId, loja_id);
        if (!respBling?.data?.[0]?.link) throw new Error(`Link da etiqueta para o pedido ${numero_pedido_loja} não retornado.`);

        await processarESalvarEtiqueta(pedidoId, loja_id, numero_pedido_loja, respBling.data[0]);
        await generateSingleLabelPdf(numero_pedido_loja);
    } catch (err) {
        await supabase.from(TABELA_ETIQUETAS_ENVIO).update({
            erro: `Processo imediato/fallback: ${err.message}`
        }).eq('pedido_id', pedidoId);
    }
};

const salvarDadosPedido = async (detalhes, empresa, token, logger) => {
    const { id, numero, numeroLoja, data, dataSaida, total, contato = {}, situacao = {}, loja = {}, notaFiscal = {}, transporte = {} } = detalhes;
    const payload = {
        id_bling: id,
        numero,
        numero_pedido_loja: numeroLoja,
        data,
        datasaida: dataSaida,
        total,
        contato_id: contato.id,
        contato_nome: contato.nome,
        contato_documento: contato.numeroDocumento,
        situacao_bling: situacao.id,
        loja: loja.id,
        notafiscal: notaFiscal.id,
        itens_json: JSON.stringify(detalhes.itens || []),
        json_pedido: JSON.stringify(detalhes),
        etiqueta_nome: transporte.etiqueta?.nome,
        etiqueta_endereco: transporte.etiqueta?.endereco,
        etiqueta_numero: transporte.etiqueta?.numero,
        etiqueta_complemento: transporte.etiqueta?.complemento,
        etiqueta_municipio: transporte.etiqueta?.municipio,
        etiqueta_uf: transporte.etiqueta?.uf,
        etiqueta_cep: transporte.etiqueta?.cep,
        codigorastreamento: transporte.volumes?.[0]?.codigoRastreamento
    };

    await supabase.from(TABELA_PEDIDOS).upsert(payload, { onConflict: 'id_bling' });

    if (id && loja.id && numeroLoja) {
        await supabase.from(TABELA_ETIQUETAS_ENVIO).upsert({
            empresa,
            pedido_id: id,
            loja_id: loja.id,
            numero_pedido_loja: numeroLoja
        }, { onConflict: 'pedido_id' });
    }

    if (detalhes.itens?.length) {
        const itensPayload = detalhes.itens.map(item => ({
            item_id: item.id,
            id_bling: id,
            numero_pedido_loja: numeroLoja,
            numero,
            loja: loja.id,
            data,
            situacao_bling: situacao.id,
            item_codigo: item.codigo,
            item_descricao: item.descricao,
            item_quantidade: item.quantidade,
            item_valor: item.valor
        }));
        await supabase.from(TABELA_ITENS).upsert(itensPayload, { onConflict: 'item_id' });
    }

    if (token && id) {
        setTimeout(() => processarEtiquetaCompletaImediatamente(token, id, empresa, logger), 1000);
    }
};

const salvarDadosNFe = async (detalhes, logger) => {
    const { id, numero, numeroPedidoLoja, serie, tipo, situacao, valorNota, dataEmissao, dataOperacao, chaveAcesso, xml, linkDanfe, linkPDF, contato = {}, loja = {} } = detalhes;
    const payload = {
        id_nf: id,
        numero_nf: numero,
        numero_pedido_loja: numeroPedidoLoja,
        serie,
        tipo,
        situacao,
        valor_nota: valorNota,
        data_emissao: dataEmissao,
        data_operacao: dataOperacao,
        chave_acesso: chaveAcesso,
        xml_url: xml,
        link_danfe: linkDanfe,
        link_pdf: linkPDF,
        contato_id: contato.id,
        contato_nome: contato.nome,
        contato_documento: contato.numeroDocumento,
        telefone: contato.telefone,
        loja_id: loja.id,
        endereco_json: JSON.stringify(contato.endereco || {})
    };
    await supabase.from(TABELA_NOTAS_FISCAIS).upsert(payload, { onConflict: 'id_nf' });
};

const logToClient = (res, message) => {
    if (!res.writableEnded) res.write(`data: ${JSON.stringify(message)}\n\n`);
};

const setupSSE = (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    const keepAliveInterval = setInterval(() => {
        if (!res.writableEnded) res.write(': keep-alive\n\n');
        else clearInterval(keepAliveInterval);
    }, 10000);
    req.on('close', () => {
        clearInterval(keepAliveInterval);
        res.end();
    });
};

const processos = {
    etiquetas: { timeout: null, isRunning: false, active: false, intervalMs: 1800000 },
    pedidos:   { timeout: null, isRunning: false, active: false, intervalMs: 1800000 },
    nfe:       { timeout: null, isRunning: false, active: false, intervalMs: 1800000 }
};

const processarEtiquetasPendentes = async () => {
    if (processos.etiquetas.isRunning) return;
    processos.etiquetas.isRunning = true;
    try {
        const { data: pendentes, error } = await supabase.from(TABELA_ETIQUETAS_ENVIO)
            .select('pedido_id, empresa')
            .is('link', null)
            .order('created_at', { ascending: true })
            .limit(20);

        if (error) throw error;

        for (const pendente of pendentes) {
            const { data: conta } = await supabase.from(TABELA_CONTAS)
                .select('token')
                .eq('empresa', pendente.empresa)
                .single();

            if (conta?.token) {
                await processarEtiquetaCompletaImediatamente(conta.token, pendente.pedido_id, pendente.empresa, console.log);
                await delay(BLING_API_DELAY_MS * 2);
            }
        }
    } catch (err) {
        console.error('[AUTO] [FALLBACK] ❌ Erro:', err.message);
    } finally {
        processos.etiquetas.isRunning = false;
    }
};

const importarPedidosEmLote = async () => {
    const dF = new Date().toISOString().slice(0, 10);
    const dI = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    for (const conta of await getContas()) {
        if (!conta.token) continue;
        for (const pedido of await fetchPaginatedData(conta.token, 'pedidos/vendas', { dataInicial: dI, dataFinal: dF }, console.log)) {
            const detalhes = await getDetalhes(conta.token, 'pedidos/vendas', pedido.id, console.log);
            if (detalhes) await salvarDadosPedido(detalhes, conta.empresa, conta.token, console.log);
        }
    }
};

const importarNFeEmLote = async () => {
    const dF = new Date().toISOString().slice(0, 10);
    const dI = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    for (const c of await getContas()) {
        if (!c.token) continue;
        const p = { dataEmissaoInicial: `${dI} 00:00:00`, dataEmissaoFinal: `${dF} 23:59:59`, tipo: 1 };
        for (const n of await fetchPaginatedData(c.token, 'nfe', p, console.log)) {
            const d = await getDetalhes(c.token, 'nfe', n.id, console.log);
            if (d) await salvarDadosNFe(d, console.log);
        }
    }
};

const iniciarLoop = (nome, funcao) => {
    if (processos[nome]?.active) return;
    processos[nome].active = true;
    const task = async () => {
        if (processos[nome].isRunning) return;
        processos[nome].isRunning = true;
        try {
            await funcao();
        } catch (error) {
            console.error(`[LOOP] ❌ Erro no loop '${nome}':`, error);
        } finally {
            processos[nome].isRunning = false;
            if (processos[nome].active) {
                processos[nome].timeout = setTimeout(task, processos[nome].intervalMs);
            }
        }
    };
    task();
};

const pararLoop = (nome) => {
    if (!processos[nome]?.active) return;
    processos[nome].active = false;
    if (processos[nome].timeout) clearTimeout(processos[nome].timeout);
    processos[nome].timeout = null;
};

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/api', (req, res) => {
    res.json({ message: 'ERP Shekinah Calçados - Backend API', version: '1.0.0' });
});

app.post('/api/queue/add-print-job', (req, res) => {
    const { zpl } = req.body;
    if (!zpl) {
        return res.status(400).json({ error: 'O campo "zpl" é obrigatório.' });
    }

    const job = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        zplData: zpl,
        status: 'pending',
        createdAt: new Date().toISOString()
    };

    printQueue.push(job);
    console.log(`[PRINT QUEUE] Novo trabalho adicionado. ID: ${job.id}. Tamanho da fila: ${printQueue.length}`);

    res.status(202).json({ message: 'Trabalho de impressão adicionado à fila.', job });
});

app.get('/api/queue/get-next-job', (req, res) => {
    if (printQueue.length > 0) {
        const job = printQueue.shift();
        console.log(`[PRINT QUEUE] Entregando trabalho ID ${job.id} ao agente. Restam na fila: ${printQueue.length}`);
        res.status(200).json(job);
    } else {
        res.status(204).send();
    }
});

app.get('/api/zpl/:lojaId/:numeroPedidoLoja', async (req, res, next) => {
    try {
        const { lojaId, numeroPedidoLoja } = req.params;
        const zplPath = path.join(ETIQUETAS_ZPL_GERADO_PATH, lojaId, `${numeroPedidoLoja}.zpl`);
        if (fs.existsSync(zplPath)) {
            await supabase.rpc('registrar_impressao_zpl', { p_numero_pedido_loja: numeroPedidoLoja });
            const zplContent = await fsPromises.readFile(zplPath, 'utf-8');
            res.setHeader('Content-Type', 'text/plain');
            res.send(zplContent);
        } else {
            res.status(404).json({ message: 'Arquivo ZPL não encontrado.' });
        }
    } catch (e) {
        next(e);
    }
});

const combinarEEnviarZPL = async (pedidos, res, next) => {
    try {
        console.log(`[ZPL LOTE] Recebido ${pedidos.length} pedidos para processar.`);

        const pedidosComSku = await Promise.all(pedidos.map(async (pedido) => {
            const { data } = await supabase.from('item_pedido_vendas')
                .select('item_codigo')
                .eq('numero_pedido_loja', pedido.numero_pedido_loja)
                .order('item_codigo', { ascending: true })
                .limit(1)
                .single();
            return { ...pedido, sku: data?.item_codigo || 'ZZZ_FALLBACK' };
        }));

        pedidosComSku.sort((a, b) => a.sku.localeCompare(b.sku));

        let zplCombinado = '';
        const pedidosProcessados = [];
        const pedidosIgnorados = [];

        for (const pedido of pedidosComSku) {
            const zplPath = path.join(ETIQUETAS_ZPL_GERADO_PATH, String(pedido.loja_id), `${pedido.numero_pedido_loja}.zpl`);
            if (fs.existsSync(zplPath)) {
                zplCombinado += await fsPromises.readFile(zplPath, 'utf-8') + '\n';
                pedidosProcessados.push(pedido.numero_pedido_loja);
            } else {
                console.warn(`[ZPL LOTE] ARQUIVO NÃO ENCONTRADO: ${zplPath}`);
                pedidosIgnorados.push(pedido.numero_pedido_loja);
            }
        }

        if (pedidosProcessados.length > 0) {
            const batchSize = 50;
            for (let i = 0; i < pedidosProcessados.length; i += batchSize) {
                const lote = pedidosProcessados.slice(i, i + batchSize);
                const { error: rpcError } = await supabase.rpc('registrar_impressao_lote', {
                    p_numeros_pedido_loja: lote
                });
                if (rpcError) {
                    console.error(`[ZPL LOTE] ERRO ao atualizar status:`, rpcError.message);
                }
            }
        }

        res.status(200).json({
            zplData: zplCombinado,
            processedCount: pedidosProcessados.length,
            skippedCount: pedidosIgnorados.length,
            message: `Processadas ${pedidosProcessados.length} etiquetas. ${pedidosIgnorados.length} ignoradas.`
        });
    } catch (error) {
        console.error('[ZPL LOTE] Erro:', error);
        next(error);
    }
};

app.post('/api/etiquetas/zpl-lote', async (req, res, next) => {
    const { pedidos } = req.body;
    if (!pedidos || !Array.isArray(pedidos) || pedidos.length === 0) {
        return res.status(400).json({ message: 'A lista de pedidos é obrigatória.' });
    }
    await combinarEEnviarZPL(pedidos, res, next);
});

app.post('/api/etiquetas/zpl-lote-por-filtro', async (req, res, next) => {
    const { filtros } = req.body;
    if (!filtros || !filtros.loja_id) {
        return res.status(400).json({ message: 'Filtros, incluindo loja_id, são obrigatórios.' });
    }

    try {
        let query = supabase.from('nota_fiscal').select('loja_id, numero_pedido_loja');
        query = query.eq('loja_id', filtros.loja_id);
        if (filtros.dataInicio) query = query.gte('data_emissao', filtros.dataInicio);
        if (filtros.dataFim) query = query.lte('data_emissao', filtros.dataFim + 'T23:59:59');
        if (filtros.situacao) query = query.eq('situacao', parseInt(filtros.situacao));
        if (filtros.numeroPedido) query = query.ilike('numero_pedido_loja', `%${filtros.numeroPedido}%`);

        const { data: notasFiscais, error: notasError } = await query;
        if (notasError) throw notasError;
        if (!notasFiscais?.length) return res.status(404).json({ message: 'Nenhum pedido encontrado.' });

        let pedidosFinais = notasFiscais;
        if (filtros.statusImpressao) {
            const numerosDePedido = notasFiscais.map(nf => nf.numero_pedido_loja);
            const { data: dadosImpressao } = await supabase.from('etiquetas_envio_dados')
                .select('numero_pedido_loja, situacao_impressa')
                .in('numero_pedido_loja', numerosDePedido);

            const mapaImpressoes = new Map((dadosImpressao || []).map(d => [d.numero_pedido_loja, d.situacao_impressa]));

            pedidosFinais = notasFiscais.filter(nf => {
                const status = mapaImpressoes.get(nf.numero_pedido_loja);
                if (filtros.statusImpressao === 'pendente') return !status;
                if (filtros.statusImpressao === 'impresso') return status === 'Impresso';
                if (filtros.statusImpressao === 'reimpresso') return status === 'Reimpresso';
                return true;
            });
        }

        if (!pedidosFinais.length) return res.status(404).json({ message: 'Nenhum pedido encontrado após filtro.' });
        await combinarEEnviarZPL(pedidosFinais, res, next);
    } catch (error) {
        next(error);
    }
});

app.post('/api/etiquetas/atualizar-contador', async (req, res) => {
  try {
    const { numero_pedido_loja } = req.body;
    if (!numero_pedido_loja) return res.status(400).json({ message: 'numero_pedido_loja é obrigatório' });

    const { data: reg } = await supabase.from('etiquetas_envio_dados')
        .select('impressoes_count')
        .eq('numero_pedido_loja', numero_pedido_loja)
        .single();

    const novoContador = (reg?.impressoes_count || 0) + 1;
    const { error } = await supabase.from('etiquetas_envio_dados').upsert({
        numero_pedido_loja,
        impressoes_count: novoContador,
        situacao_impressa: 'Impresso',
        updated_at: new Date().toISOString()
    }, { onConflict: 'numero_pedido_loja' });

    if (error) return res.status(500).json({ message: 'Erro ao atualizar contador.' });
    res.json({ message: 'Contador atualizado.', contador_atual: novoContador });
  } catch (error) {
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

app.post('/api/processos/:nome/iniciar', (req, res) => {
    const funcoes = {
        pedidos: importarPedidosEmLote,
        nfe: importarNFeEmLote,
        etiquetas: processarEtiquetasPendentes
    };
    if (!funcoes[req.params.nome]) return res.status(400).json({ message: 'Processo inválido.' });
    iniciarLoop(req.params.nome, funcoes[req.params.nome]);
    res.status(200).json({ message: `Processo ${req.params.nome} iniciado.` });
});

app.post('/api/processos/:nome/parar', (req, res) => {
    pararLoop(req.params.nome);
    res.status(200).json({ message: `Processo ${req.params.nome} parado.` });
});

app.get('/api/processos/status', (req, res) => {
    res.status(200).json({
        etiquetas: processos.etiquetas.active,
        pedidos: processos.pedidos.active,
        nfe: processos.nfe.active
    });
});

app.get('/api/etiquetas/pendentes', async (req, res, next) => {
    try {
        const { data, error } = await supabase.from(TABELA_ETIQUETAS_ENVIO)
            .select('pedido_id, numero_pedido_loja, created_at, empresa')
            .is('situacao_baixada', null)
            .order('created_at', { ascending: false });
        if (error) throw error;
        res.status(200).json(data);
    } catch (e) {
        next(e);
    }
});

app.get('/api/etiquetas/prontas-para-geracao', async (req, res, next) => {
    try {
        const { data, error } = await supabase.from(TABELA_ETIQUETAS_ENVIO)
            .select('pedido_id, numero_pedido_loja, created_at, empresa')
            .eq('situacao_baixada', 'pdf transporte salvo')
            .order('created_at', { ascending: false });
        if (error) throw error;
        res.status(200).json(data);
    } catch (e) {
        next(e);
    }
});

app.post('/api/etiquetas/processar-transporte', async (req, res, next) => {
    try {
        const { pedido_id, empresa } = req.body;
        if (!pedido_id || !empresa) return res.status(400).json({ message: 'Campos obrigatórios: pedido_id e empresa.' });

        const { data: c } = await supabase.from(TABELA_CONTAS).select('token').eq('empresa', empresa).single();
        if (!c?.token) throw new Error(`Conta não encontrada: ${empresa}`);

        const { data: e } = await supabase.from(TABELA_ETIQUETAS_ENVIO).select('loja_id, numero_pedido_loja').eq('pedido_id', pedido_id).single();
        if (!e) throw new Error(`Dados do pedido ${pedido_id} não encontrados.`);

        const r = await baixarEtiquetaBling(c.token, pedido_id, e.loja_id);
        if (r?.data?.[0]?.link) {
            await processarESalvarEtiqueta(pedido_id, e.loja_id, e.numero_pedido_loja, r.data[0]);
            return res.status(200).json({ message: `Etiqueta para ${e.numero_pedido_loja} processada!` });
        }
        return res.status(404).json({ message: 'Etiqueta não encontrada no Bling.' });
    } catch (e) {
        next(e);
    }
});

app.post('/api/etiquetas/gerar-romaneio', async (req, res, next) => {
    try {
        const { numero_pedido_loja } = req.body;
        if (!numero_pedido_loja) return res.status(400).json({ message: 'numero_pedido_loja obrigatório.' });

        const b = await generateSingleLabelPdf(numero_pedido_loja);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename=etiqueta_${numero_pedido_loja}.pdf`);
        res.send(Buffer.from(b));
    } catch (e) {
        next(e);
    }
});

app.post('/api/etiquetas/gerar-lote', async (req, res, next) => {
    const { numeros_pedido_loja } = req.body;
    if (!numeros_pedido_loja?.length) return res.status(400).json({ message: 'Array "numeros_pedido_loja" obrigatório.' });

    try {
        const p = await Promise.all(numeros_pedido_loja.map(async n => ({
            n,
            sku: (await supabase.from(TABELA_ITENS).select('item_codigo').eq('numero_pedido_loja', n).limit(1).single()).data?.item_codigo || 'ZZZ'
        })));
        p.sort((a, b) => a.sku.localeCompare(b.sku));

        const d = await PDFDocument.create();
        for (const {n} of p) {
            try {
                const b = await generateSingleLabelPdf(n);
                const [c] = await d.copyPages(await PDFDocument.load(b), [0]);
                d.addPage(c);
            } catch (err) {
                console.error(`Erro ao gerar etiqueta para ${n}:`, err.message);
            }
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename=lote_etiquetas.pdf');
        res.send(Buffer.from(await d.save()));
    } catch (e) {
        next(e);
    }
});

app.get('/api/pedido/:numeroPedidoLoja/itens', async (req, res, next) => {
    try {
        const { data, error } = await supabase.from(TABELA_ITENS_PEDIDO)
            .select('item_codigo, item_descricao, item_quantidade')
            .eq('numero_pedido_loja', req.params.numeroPedidoLoja)
            .order('item_codigo', { ascending: true });
        if (error) throw error;
        res.status(200).json(data || []);
    } catch (e) {
        next(e);
    }
});

app.get('/api/importar/pedidos', async (req, res) => {
    setupSSE(req, res);
    const logger = (m) => logToClient(res, m);
    try {
        const { dataInicial, dataFinal } = req.query;
        if (!dataInicial || !dataFinal) return logger(`❌ ERRO: Datas obrigatórias.`);

        for (const conta of await getContas()) {
            if (!conta.token) continue;
            const pedidos = await fetchPaginatedData(conta.token, 'pedidos/vendas', { dataInicial, dataFinal }, logger);
            for (const pedido of pedidos) {
                const detalhes = await getDetalhes(conta.token, 'pedidos/vendas', pedido.id, logger);
                if (detalhes) await salvarDadosPedido(detalhes, conta.empresa, conta.token, logger);
            }
        }
    } catch (e) {
        logger(`\n\n❌ ERRO CRÍTICO: ${e.message}`);
    } finally {
        logToClient(res, '__END__');
    }
});

app.get('/api/importar/nfe', async (req, res) => {
    setupSSE(req, res);
    const logger = (m) => logToClient(res, m);
    try {
        const { dataInicial, dataFinal } = req.query;
        if (!dataInicial || !dataFinal) return logger(`❌ ERRO: Datas obrigatórias.`);

        const params = {
            dataEmissaoInicial: `${dataInicial} 00:00:00`,
            dataEmissaoFinal: `${dataFinal} 23:59:59`,
            tipo: 1
        };

        for (const conta of await getContas()) {
            if (!conta.token) continue;
            const notas = await fetchPaginatedData(conta.token, 'nfe', params, logger);
            for (const nota of notas) {
                const detalhes = await getDetalhes(conta.token, 'nfe', nota.id, logger);
                if (detalhes) await salvarDadosNFe(detalhes, logger);
            }
        }
    } catch (e) {
        logger(`\n\n❌ ERRO CRÍTICO: ${e.message}`);
    } finally {
        logToClient(res, '__END__');
    }
});

app.use(express.static(path.join(__dirname, 'dist'), {
    maxAge: '1d',
    etag: true,
    lastModified: true,
    index: 'index.html'
}));

app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
        return next();
    }
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.use((req, res) => {
    res.status(404).json({ error: 'Rota não encontrada', path: req.originalUrl });
});

app.use((error, req, res, next) => {
    console.error('❌ ERRO GLOBAL:', error.message);
    if (error.stack) console.error(error.stack.substring(0, 500));
    if (res.headersSent) return next(error);

    if (error.isAxiosError) {
        return res.status(error.response?.status || 500).json({
            error: 'Erro de comunicação com serviço externo.',
            details: error.response?.data?.error || error.message,
        });
    }

    res.status(error.status || 500).json({
        error: NODE_ENV === 'production' ? 'Erro interno do servidor' : error.message
    });
});

const startServer = async () => {
    try {
        const pdfToImgModule = await import('pdf-to-img');
        pdf = pdfToImgModule.pdf;
        console.log('[SYSTEM] Módulo de conversão PDF->IMG carregado.');

        const server = app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Servidor rodando na porta ${PORT} em modo ${NODE_ENV}`);
            console.log(`📁 Servindo arquivos estáticos de: ${path.join(__dirname, 'dist')}`);

            [ETIQUETAS_BASE_PATH, ETIQUETAS_IMAGENS_PATH, PDF_GERADOS_PATH, ETIQUETAS_ZPL_GERADO_PATH].forEach(dir => {
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                    console.log(`📂 Diretório criado: ${dir}`);
                }
            });

            if (AUTO_START_LOOPS.pedidos) iniciarLoop('pedidos', importarPedidosEmLote);
            if (AUTO_START_LOOPS.nfe) iniciarLoop('nfe', importarNFeEmLote);
            if (AUTO_START_LOOPS.etiquetas) iniciarLoop('etiquetas', processarEtiquetasPendentes);
        });

        const gracefulShutdown = (signal) => {
            console.log(`\n${signal} recebido, encerrando...`);
            server.close(() => {
                console.log('Servidor encerrado.');
                process.exit(0);
            });
        };

        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    } catch (error) {
        console.error('❌ [SYSTEM] Falha ao iniciar o servidor:', error);
        process.exit(1);
    }
};

startServer();
