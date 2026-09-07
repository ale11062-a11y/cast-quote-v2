import fs from 'fs';
import path from 'path';
import initSqlJs, { Database } from 'sql.js';

let dbInstance: Database | null = null;
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'castquote.db');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

export async function getDatabase(): Promise<Database> {
  if (dbInstance) {
    return dbInstance;
  }

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    try {
      const fileBuffer = fs.readFileSync(DB_PATH);
      dbInstance = new SQL.Database(fileBuffer);
    } catch (err) {
      console.error('Failed to load existing database file, creating fresh one:', err);
      dbInstance = new SQL.Database();
    }
  } else {
    dbInstance = new SQL.Database();
  }

  initSchema(dbInstance);
  saveDatabase();
  return dbInstance;
}

export function saveDatabase() {
  if (!dbInstance) return;
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  } catch (err) {
    console.error('Failed to save database to disk:', err);
  }
}

export function queryAll<T = any>(sql: string, params: any[] = []): T[] {
  if (!dbInstance) throw new Error('Database not initialized');
  const stmt = dbInstance.prepare(sql);
  if (params && params.length > 0) {
    stmt.bind(params);
  }
  const results: T[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    results.push(row as unknown as T);
  }
  stmt.free();
  return results;
}

export function queryOne<T = any>(sql: string, params: any[] = []): T | null {
  const all = queryAll<T>(sql, params);
  return all.length > 0 ? all[0] : null;
}

export function runSql(sql: string, params: any[] = []): void {
  if (!dbInstance) throw new Error('Database not initialized');
  dbInstance.run(sql, params);
  saveDatabase();
}

function initSchema(db: Database) {
  db.run(`
    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      cnpj TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      logo_url TEXT,
      primary_color TEXT DEFAULT '#2563eb',
      active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      company_id TEXT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      active INTEGER DEFAULT 1,
      avatar_url TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS technicians (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      role_title TEXT,
      active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      name TEXT NOT NULL,
      document TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      notes TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS quotes (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      quote_number INTEGER NOT NULL,
      client_id TEXT NOT NULL,
      technician_id TEXT,
      created_by TEXT NOT NULL,
      date TEXT NOT NULL,
      validity_date TEXT,
      status TEXT NOT NULL DEFAULT 'Rascunho',
      description TEXT NOT NULL,
      address TEXT,
      subtotal REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      addition REAL DEFAULT 0,
      total REAL DEFAULT 0,
      notes TEXT,
      client_signature TEXT,
      client_signed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS quote_items (
      id TEXT PRIMARY KEY,
      quote_id TEXT NOT NULL,
      item_type TEXT NOT NULL,
      description TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 1,
      unit TEXT DEFAULT 'UN',
      unit_price REAL NOT NULL DEFAULT 0,
      total_price REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS quote_photos (
      id TEXT PRIMARY KEY,
      quote_id TEXT NOT NULL,
      company_id TEXT NOT NULL,
      url TEXT NOT NULL,
      caption TEXT,
      width INTEGER NOT NULL,
      height INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS work_orders (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      order_number INTEGER NOT NULL,
      quote_id TEXT,
      client_id TEXT NOT NULL,
      technician_id TEXT NOT NULL,
      created_by TEXT NOT NULL,
      date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Aberta',
      service_description TEXT NOT NULL,
      address TEXT,
      notes TEXT,
      subtotal REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      addition REAL DEFAULT 0,
      total REAL DEFAULT 0,
      client_signature TEXT,
      client_signed_at TEXT,
      technician_signature TEXT,
      technician_signed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS work_order_items (
      id TEXT PRIMARY KEY,
      work_order_id TEXT NOT NULL,
      item_type TEXT NOT NULL,
      description TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 1,
      unit TEXT DEFAULT 'UN',
      unit_price REAL NOT NULL DEFAULT 0,
      total_price REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS work_order_photos (
      id TEXT PRIMARY KEY,
      work_order_id TEXT NOT NULL,
      company_id TEXT NOT NULL,
      url TEXT NOT NULL,
      caption TEXT,
      width INTEGER NOT NULL,
      height INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      channel TEXT NOT NULL,
      recipient TEXT,
      status TEXT DEFAULT 'sent',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS whatsapp_settings (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL UNIQUE,
      mode TEXT DEFAULT 'wa_me',
      api_url TEXT,
      api_key TEXT,
      instance_name TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS drive_settings (
      id TEXT PRIMARY KEY,
      account_email TEXT NOT NULL,
      account_name TEXT,
      account_photo TEXT,
      root_folder_name TEXT DEFAULT 'CAST_Quote',
      auto_sync INTEGER DEFAULT 1,
      sync_photos INTEGER DEFAULT 1,
      updated_at TEXT NOT NULL
    );
  `);

  // Migration check: ensure primary_color column exists on companies table
  try {
    db.run(`ALTER TABLE companies ADD COLUMN primary_color TEXT DEFAULT '#2563eb'`);
  } catch {
    // Column already exists, safe to ignore
  }

  // Migration check: ensure signature columns exist on work_orders and quotes
  try { db.run(`ALTER TABLE work_orders ADD COLUMN client_signature TEXT;`); } catch {}
  try { db.run(`ALTER TABLE work_orders ADD COLUMN client_signed_at TEXT;`); } catch {}
  try { db.run(`ALTER TABLE work_orders ADD COLUMN technician_signature TEXT;`); } catch {}
  try { db.run(`ALTER TABLE work_orders ADD COLUMN technician_signed_at TEXT;`); } catch {}
  try { db.run(`ALTER TABLE quotes ADD COLUMN client_signature TEXT;`); } catch {}
  try { db.run(`ALTER TABLE quotes ADD COLUMN client_signed_at TEXT;`); } catch {}

  // Migration check: ensure users table company_id allows NULL
  try {
    const tableInfo = db.exec("PRAGMA table_info(users)");
    if (tableInfo.length > 0) {
      const companyIdCol = tableInfo[0].values.find(v => v[1] === 'company_id');
      if (companyIdCol && companyIdCol[3] === 1) {
        db.run('BEGIN TRANSACTION;');
        db.run('CREATE TABLE users_new (id TEXT PRIMARY KEY, company_id TEXT, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, role TEXT NOT NULL, active INTEGER DEFAULT 1, avatar_url TEXT, created_at TEXT NOT NULL);');
        db.run('INSERT INTO users_new (id, company_id, name, email, password, role, active, avatar_url, created_at) SELECT id, company_id, name, email, password, role, active, avatar_url, created_at FROM users;');
        db.run('DROP TABLE users;');
        db.run('ALTER TABLE users_new RENAME TO users;');
        db.run("UPDATE users SET company_id = NULL WHERE role = 'DEV';");
        db.run('COMMIT;');
      }
    }
  } catch (err) {
    console.error('Error verifying users table company_id nullability:', err);
  }

  // Ensure requested Dev accounts exist with full DEV role and requested credentials
  try {
    const nowIso = new Date().toISOString();
    
    // DEV Ale
    const existingAle = queryOne(`SELECT * FROM users WHERE email = ?`, ['ale11062@gmail.com']);
    if (!existingAle) {
      db.run(
        `INSERT INTO users (id, company_id, name, email, password, role, active, created_at)
         VALUES ('usr-dev-ale', NULL, 'Desenvolvedor Master (Ale)', 'ale11062@gmail.com', 'cast.2468', 'DEV', 1, ?)`,
        [nowIso]
      );
    } else {
      db.run(
        `UPDATE users SET password = 'cast.2468', role = 'DEV', company_id = NULL, active = 1, name = 'Desenvolvedor Master (Ale)'
         WHERE email = 'ale11062@gmail.com'`
      );
    }

    // DEV ClientesIPTV
    const existingCliente = queryOne(`SELECT * FROM users WHERE email = ?`, ['clientesiptv.2468@gmail.com']);
    if (!existingCliente) {
      db.run(
        `INSERT INTO users (id, company_id, name, email, password, role, active, created_at)
         VALUES ('usr-dev-cliente', NULL, 'Administrador Master DEV', 'clientesiptv.2468@gmail.com', 'cast.2468', 'DEV', 1, ?)`,
        [nowIso]
      );
    } else {
      db.run(
        `UPDATE users SET password = 'cast.2468', role = 'DEV', company_id = NULL, active = 1, name = 'Administrador Master DEV'
         WHERE email = 'clientesiptv.2468@gmail.com'`
      );
    }

    // Unbind all DEV accounts from any company
    db.run(`UPDATE users SET company_id = NULL WHERE role = 'DEV'`);

    // Ensure comp-master-cast exists or maps to main CAST company
    const existingMaster = queryOne(`SELECT * FROM companies WHERE id = ?`, ['comp-master-cast']);
    if (!existingMaster) {
      db.run(
        `INSERT INTO companies (id, name, cnpj, email, phone, address, city, state, logo_url, primary_color, active, created_at)
         VALUES ('comp-master-cast', 'CAST Quote Engenharia & Serviços', '12.345.678/0001-90', 'contato@castquote.com.br', '(11) 98765-4321', 'Av. Paulista, 1000 - Bela Vista', 'São Paulo', 'SP', '', '#2563eb', 1, ?)`,
        [nowIso]
      );
    }
  } catch (err) {
    console.error('Error ensuring accounts and company defaults:', err);
  }

  // Seed default data if no companies exist
  const count = queryOne<{ cnt: number }>(`SELECT count(*) as cnt FROM companies`);
  if (!count || count.cnt === 0) {
    seedInitialData(db);
  }
}

function seedInitialData(db: Database) {
  const now = new Date().toISOString();

  // 1. Companies
  const c1 = 'comp-1';
  const c2 = 'comp-2';
  db.run(`INSERT INTO companies (id, name, cnpj, email, phone, address, city, state, logo_url, primary_color, active, created_at) VALUES
    (?, 'CAST Engenharia & Soluções', '12.345.678/0001-90', 'contato@castengenharia.com.br', '(11) 98765-4321', 'Av. Paulista, 1500 - Bela Vista', 'São Paulo', 'SP', '', '#2563eb', 1, ?),
    (?, 'Apex Climatização & Elétrica', '98.765.432/0001-10', 'financeiro@apexclima.com.br', '(21) 97654-3210', 'Rua Visconde de Pirajá, 300 - Ipanema', 'Rio de Janeiro', 'RJ', '', '#059669', 1, ?)`,
    [c1, now, c2, now]
  );

  // 2. Users (DEV, ADM, GERENTE, SUPERVISOR, TÉCNICO)
  db.run(`INSERT INTO users (id, company_id, name, email, password, role, active, created_at) VALUES
    ('usr-dev-ale', NULL, 'Desenvolvedor Master (Ale)', 'ale11062@gmail.com', 'cast.2468', 'DEV', 1, ?),
    ('usr-dev', NULL, 'Administrador Global DEV', 'dev@castquote.com', 'dev123', 'DEV', 1, ?),
    ('usr-adm', ?, 'Renato Mendonça (ADM)', 'adm@castengenharia.com.br', 'adm123', 'ADM', 1, ?),
    ('usr-ger', ?, 'Camila Duarte (Gerente)', 'gerente@castengenharia.com.br', 'gerente123', 'GERENTE', 1, ?),
    ('usr-sup', ?, 'Lucas Alcantara (Supervisor)', 'supervisor@castengenharia.com.br', 'super123', 'SUPERVISOR', 1, ?),
    ('usr-tec', ?, 'Carlos Silva (Técnico)', 'tecnico@castengenharia.com.br', 'tec123', 'TÉCNICO', 1, ?)`,
    [now, now, c1, now, c1, now, c1, now, c1, now]
  );

  // 3. Technicians
  const t1 = 'tec-1';
  const t2 = 'tec-2';
  const t3 = 'tec-3';
  db.run(`INSERT INTO technicians (id, company_id, name, phone, email, role_title, active, created_at) VALUES
    (?, ?, 'Carlos Eduardo Silva', '(11) 98111-2233', 'carlos.silva@castengenharia.com.br', 'Técnico Especialista em CFTV & Redes', 1, ?),
    (?, ?, 'Marcos Vinícius Souza', '(11) 97222-3344', 'marcos.souza@castengenharia.com.br', 'Eletricista Instalador Industrial', 1, ?),
    (?, ?, 'Juliana Ferreira Rocha', '(11) 96333-4455', 'juliana.rocha@castengenharia.com.br', 'Técnica em Climatização e Automação', 1, ?)`,
    [t1, c1, now, t2, c1, now, t3, c1, now]
  );

  // 4. Clients
  const cl1 = 'cli-1';
  const cl2 = 'cli-2';
  const cl3 = 'cli-3';
  db.run(`INSERT INTO clients (id, company_id, name, document, email, phone, address, city, state, notes, created_at) VALUES
    (?, ?, 'TechCorp Brasil Tecnologia S.A.', '33.444.555/0001-22', 'facilities@techcorp.com.br', '(11) 3210-9000', 'Rua Funchal, 418 - Vila Olímpia', 'São Paulo', 'SP', 'Acesso pela portaria 2, solicitar crachá de prestador.', ?),
    (?, ?, 'Condomínio Residencial Jardim das Flores', '45.678.910/0001-33', 'sindico@jardimdasflores.com.br', '(11) 95544-3322', 'Rua das Camélias, 210 - Moema', 'São Paulo', 'SP', 'Horário de serviço permitido: 08:00 às 17:00 de seg a sex.', ?),
    (?, ?, 'Dr. Fernando Albuquerque', '123.456.789-00', 'dr.fernando@clinicaalbuquerque.med.br', '(11) 99887-7665', 'Alameda Santos, 1800 - Cerqueira César', 'São Paulo', 'SP', 'Consultório médico no 8º andar.', ?)`,
    [cl1, c1, now, cl2, c1, now, cl3, c1, now]
  );

  // 5. Sample Vertical SVG base64 Photos (strictly vertical: 600 width x 900 height = 2:3 aspect ratio)
  const verticalSvg1 = createVerticalPhotoSvg('Inspeção Painel Elétrico', '#1e3a8a', '#3b82f6');
  const verticalSvg2 = createVerticalPhotoSvg('Instalação Câmera 4K', '#065f46', '#10b981');
  const verticalSvg3 = createVerticalPhotoSvg('Cabeamento Estruturado', '#7c2d12', '#f97316');
  const verticalSvg4 = createVerticalPhotoSvg('Quadro Distribuição', '#581c87', '#a855f7');
  const verticalSvg5 = createVerticalPhotoSvg('Rack Servidores 42U', '#1e293b', '#64748b');
  const verticalSvg6 = createVerticalPhotoSvg('Equipamento Finalizado', '#0f766e', '#14b8a6');

  // 6. Quotes
  const q1 = 'quote-1001';
  db.run(`INSERT INTO quotes (id, company_id, quote_number, client_id, technician_id, created_by, date, validity_date, status, description, address, subtotal, discount, addition, total, notes, created_at, updated_at) VALUES
    (?, ?, 1001, ?, ?, 'usr-adm', '2026-09-02', '2026-09-17', 'Aprovado', 'Modernização completa do sistema de CFTV IP e controle de acesso biométrico.', 'Rua Funchal, 418 - Vila Olímpia, São Paulo - SP', 7450.00, 250.00, 0.00, 7200.00, 'Garantia de 12 meses nos equipamentos e 90 dias na mão de obra.', ?, ?)`,
    [q1, c1, cl1, t1, now, now]
  );

  // Quote Items
  db.run(`INSERT INTO quote_items (id, quote_id, item_type, description, quantity, unit, unit_price, total_price) VALUES
    ('qi-1', ?, 'material', 'Câmera Dome IP 4K com Visão Noturna IR 30m', 6, 'UN', 450.00, 2700.00),
    ('qi-2', ?, 'material', 'NVR 16 Canais PoE 4K com HD de 4TB Surveillance', 1, 'UN', 1850.00, 1850.00),
    ('qi-3', ?, 'material', 'Cabo de Rede UTP Cat6 100% Cobre Homologado (caixa 305m)', 1, 'CX', 580.00, 580.00),
    ('qi-4', ?, 'servico', 'Instalação física, conectorização e fusão de cabos de rede', 6, 'PT', 120.00, 720.00),
    ('qi-5', ?, 'servico', 'Configuração de NVR, portas de roteador e aplicativo mobile CAST Quote', 1, 'SV', 1600.00, 1600.00)`,
    [q1, q1, q1, q1, q1]
  );

  // Quote Photos (all strictly vertical: 600x900)
  db.run(`INSERT INTO quote_photos (id, quote_id, company_id, url, caption, width, height, created_at) VALUES
    ('qp-1', ?, ?, ?, 'Foto 1 - Ponto de fixação da câmera no teto', 600, 900, ?),
    ('qp-2', ?, ?, ?, 'Foto 2 - Rack principal de telecomunicações', 600, 900, ?),
    ('qp-3', ?, ?, ?, 'Foto 3 - Tubulação vertical para passagem de cabos', 600, 900, ?)`,
    [q1, c1, verticalSvg1, now, q1, c1, verticalSvg2, now, q1, c1, verticalSvg3, now]
  );

  // 7. Work Orders
  const wo1 = 'wo-2001';
  db.run(`INSERT INTO work_orders (id, company_id, order_number, quote_id, client_id, technician_id, created_by, date, status, service_description, address, notes, subtotal, discount, addition, total, created_at, updated_at) VALUES
    (?, ?, 2001, ?, ?, ?, 'usr-sup', '2026-09-03', 'Em Andamento', 'Execução da instalação de infraestrutura elétrica e ligação de grupo gerador.', 'Alameda Santos, 1800 - Cerqueira César, São Paulo - SP', 'Necessário desligamento programado do quadro geral às 14h com aprovação do síndico.', 3980.00, 100.00, 120.00, 4000.00, ?, ?)`,
    [wo1, c1, q1, cl3, t2, now, now]
  );

  // Work Order Items
  db.run(`INSERT INTO work_order_items (id, work_order_id, item_type, description, quantity, unit, unit_price, total_price) VALUES
    ('woi-1', ?, 'servico', 'Passagem de cabos de força 16mm² antichama', 45, 'MT', 28.00, 1260.00),
    ('woi-2', ?, 'material', 'Disjuntor Caixa Moldada Tripolar 125A Curva C', 2, 'UN', 420.00, 840.00),
    ('woi-3', ?, 'material', 'Barramento de Cobre Eletrolítico 150A com Isoladores', 1, 'JG', 380.00, 380.00),
    ('woi-4', ?, 'servico', 'Comissionamento e teste de carga em banco resistivo', 1, 'SV', 1500.00, 1500.00)`,
    [wo1, wo1, wo1, wo1]
  );

  // Work Order Photos (6 vertical photos to demonstrate 5-per-row + 6th on second line!)
  db.run(`INSERT INTO work_order_photos (id, work_order_id, company_id, url, caption, width, height, created_at) VALUES
    ('wop-1', ?, ?, ?, 'Foto 1 - Vista geral do painel de entrada', 600, 900, ?),
    ('wop-2', ?, ?, ?, 'Foto 2 - Barramento antes da intervenção', 600, 900, ?),
    ('wop-3', ?, ?, ?, 'Foto 3 - Termografia dos pontos de conexão', 600, 900, ?),
    ('wop-4', ?, ?, ?, 'Foto 4 - Disjuntores instalados e identificados', 600, 900, ?),
    ('wop-5', ?, ?, ?, 'Foto 5 - Cabos organizados com anilhas e espaguete', 600, 900, ?),
    ('wop-6', ?, ?, ?, 'Foto 6 - Teste de tensão e medição de isolação', 600, 900, ?)`,
    [
      wo1, c1, verticalSvg1, now,
      wo1, c1, verticalSvg2, now,
      wo1, c1, verticalSvg3, now,
      wo1, c1, verticalSvg4, now,
      wo1, c1, verticalSvg5, now,
      wo1, c1, verticalSvg6, now
    ]
  );

  // Notifications
  db.run(`INSERT INTO notifications (id, company_id, title, message, channel, recipient, status, created_at) VALUES
    ('notif-1', ?, 'Orçamento #1001 Aprovado!', 'O cliente TechCorp Brasil aprovou o orçamento no valor de R$ 7.200,00.', 'whatsapp', '(11) 3210-9000', 'sent', ?),
    ('notif-2', ?, 'Ordem de Serviço #2001 Iniciada', 'Técnico Marcos Vinícius iniciou os trabalhos em Dr. Fernando Albuquerque.', 'email', 'facilities@techcorp.com.br', 'sent', ?)`,
    [c1, now, c1, now]
  );
}

function createVerticalPhotoSvg(title: string, color1: string, color2: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="${color1}"/>
        <stop offset="100%" stop-color="${color2}"/>
      </linearGradient>
    </defs>
    <rect width="600" height="900" fill="url(#g)"/>
    <rect x="20" y="20" width="560" height="860" fill="none" stroke="#ffffff" stroke-width="4" stroke-dasharray="10 10" opacity="0.4"/>
    <circle cx="300" cy="380" r="100" fill="#ffffff" opacity="0.15"/>
    <path d="M250 400 L285 435 L350 355" fill="none" stroke="#ffffff" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="300" y="540" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="#ffffff" text-anchor="middle">REGISTRO TÉCNICO CAST</text>
    <text x="300" y="590" font-family="Arial, sans-serif" font-size="22" fill="#e2e8f0" text-anchor="middle">${title}</text>
    <rect x="180" y="640" width="240" height="44" rx="22" fill="#000000" opacity="0.3"/>
    <text x="300" y="669" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#38bdf8" text-anchor="middle">ORIENTAÇÃO VERTICAL 2:3</text>
    <text x="300" y="830" font-family="Arial, sans-serif" font-size="16" fill="#cbd5e1" text-anchor="middle">Data: 04/09/2026 • Localização Registrada</text>
  </svg>`;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}
