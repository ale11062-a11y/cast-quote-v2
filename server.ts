import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { getDatabase, queryAll, queryOne, runSql } from './server/db.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parser for JSON and base64 payloads
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Initialize SQLite Database
  await getDatabase();
  console.log('Database initialized successfully.');

  // Serve static uploads
  const uploadsDir = path.join(process.cwd(), 'data', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir));

  // ==========================================
  // AUTH ROUTES
  // ==========================================
  app.post('/api/auth/login', (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
      }

      const user = queryOne(`SELECT * FROM users WHERE email = ? AND active = 1`, [email.trim().toLowerCase()]);
      if (!user || user.password !== password) {
        return res.status(401).json({ error: 'Credenciais inválidas. Verifique seu e-mail e senha.' });
      }

      // Fetch company details
      let company = null;
      if (user.role !== 'DEV' && user.company_id && user.company_id !== 'ALL') {
        company = queryOne(`SELECT * FROM companies WHERE id = ?`, [user.company_id]);
      } else {
        // DEV user is completely independent of any single company
        company = null;
      }

      // Strip password
      const { password: _, ...safeUser } = user;
      if (safeUser.role === 'DEV') {
        safeUser.company_id = null;
      }
      return res.json({
        user: safeUser,
        company: company,
        token: `token-${user.id}-${Date.now()}`
      });
    } catch (err: any) {
      console.error('Login error:', err);
      return res.status(500).json({ error: 'Erro interno ao realizar login.' });
    }
  });

  // ==========================================
  // COMPANIES ROUTES
  // ==========================================
  app.get('/api/companies', (req: Request, res: Response) => {
    try {
      const { userRole, companyId } = req.query;
      let companies;
      if (userRole === 'DEV' || !companyId || companyId === 'ALL') {
        companies = queryAll(`SELECT * FROM companies WHERE active = 1 ORDER BY name ASC`);
      } else if (companyId) {
        companies = queryAll(`SELECT * FROM companies WHERE id = ? AND active = 1`, [companyId]);
        // Safe fallback: if companyId is invalid or not found, return available active companies
        if (!companies || companies.length === 0) {
          companies = queryAll(`SELECT * FROM companies WHERE active = 1 ORDER BY name ASC`);
        }
      } else {
        companies = queryAll(`SELECT * FROM companies WHERE active = 1 ORDER BY name ASC`);
      }
      return res.json(companies || []);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/companies', (req: Request, res: Response) => {
    try {
      const { name, cnpj, email, phone, address, city, state, logo_url, primary_color, manager_name, manager_email, manager_password } = req.body;
      if (!name) return res.status(400).json({ error: 'Nome da empresa é obrigatório.' });

      const id = `comp-${Date.now()}`;
      const now = new Date().toISOString();
      const color = primary_color || '#2563eb';
      runSql(
        `INSERT INTO companies (id, name, cnpj, email, phone, address, city, state, logo_url, primary_color, active, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
        [id, name, cnpj || '', email || '', phone || '', address || '', city || '', state || '', logo_url || '', color, now]
      );

      let createdManager = null;
      if (manager_email && manager_email.trim().length > 0) {
        const mgrName = (manager_name && manager_name.trim()) ? manager_name.trim() : `Gerente ${name}`;
        const mgrPassword = (manager_password && manager_password.trim()) ? manager_password.trim() : 'Cast123';
        const userId = `usr-${Date.now()}`;
        runSql(
          `INSERT INTO users (id, company_id, name, email, password, role, active, created_at)
           VALUES (?, ?, ?, ?, ?, 'GERENTE', 1, ?)`,
          [userId, id, mgrName, manager_email.trim().toLowerCase(), mgrPassword, now]
        );
        createdManager = queryOne(`SELECT id, company_id, name, email, role, active, created_at FROM users WHERE id = ?`, [userId]);
      }

      const created = queryOne(`SELECT * FROM companies WHERE id = ?`, [id]);
      return res.status(201).json({ ...created, manager: createdManager });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/companies/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, cnpj, email, phone, address, city, state, logo_url, primary_color, active } = req.body;
      const existing = queryOne(`SELECT * FROM companies WHERE id = ?`, [id]);
      const color = primary_color !== undefined ? primary_color : (existing?.primary_color || '#2563eb');

      runSql(
        `UPDATE companies SET name = ?, cnpj = ?, email = ?, phone = ?, address = ?, city = ?, state = ?, logo_url = ?, primary_color = ?, active = ?
         WHERE id = ?`,
        [name, cnpj, email, phone, address, city, state, logo_url, color, active !== undefined ? active : 1, id]
      );

      const updated = queryOne(`SELECT * FROM companies WHERE id = ?`, [id]);
      return res.json(updated);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.patch('/api/companies/:id/branding', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { primary_color, logo_url } = req.body;
      const existing = queryOne(`SELECT * FROM companies WHERE id = ?`, [id]);
      if (!existing) {
        return res.status(404).json({ error: 'Empresa não encontrada.' });
      }

      const newColor = primary_color !== undefined ? primary_color : (existing.primary_color || '#2563eb');
      const newLogo = logo_url !== undefined ? logo_url : existing.logo_url;

      runSql(
        `UPDATE companies SET primary_color = ?, logo_url = ? WHERE id = ?`,
        [newColor, newLogo, id]
      );

      const updated = queryOne(`SELECT * FROM companies WHERE id = ?`, [id]);
      return res.json(updated);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/companies/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      runSql(`UPDATE companies SET active = 0 WHERE id = ?`, [id]);
      return res.json({ success: true, message: 'Empresa desativada com sucesso.' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // USERS ROUTES
  // ==========================================
  app.get('/api/users', (req: Request, res: Response) => {
    try {
      const { companyId } = req.query;
      let sql = `
        SELECT u.id, u.company_id, u.name, u.email, u.role, u.active, u.created_at, c.name as company_name
        FROM users u
        LEFT JOIN companies c ON u.company_id = c.id
        WHERE u.role != 'DEV'
      `;
      const params: any[] = [];
      if (companyId && companyId !== 'all' && companyId !== 'ALL') {
        sql += ` AND u.company_id = ?`;
        params.push(companyId);
      }
      sql += ` ORDER BY u.name ASC`;
      const users = queryAll(sql, params);
      return res.json(users);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/users', (req: Request, res: Response) => {
    try {
      const { company_id, name, email, password, role } = req.body;
      if (!name || !email || !password || !role) {
        return res.status(400).json({ error: 'Nome, e-mail, senha e perfil são obrigatórios.' });
      }

      if (role === 'DEV') {
        return res.status(400).json({ error: 'O perfil DEV é independente e não pode ser vinculado a nenhuma empresa.' });
      }

      const existing = queryOne(`SELECT id FROM users WHERE email = ?`, [email.trim().toLowerCase()]);
      if (existing) {
        return res.status(400).json({ error: 'Já existe um usuário cadastrado com este e-mail.' });
      }

      const id = `usr-${Date.now()}`;
      const now = new Date().toISOString();
      runSql(
        `INSERT INTO users (id, company_id, name, email, password, role, active, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
        [id, company_id, name, email.trim().toLowerCase(), password, role, now]
      );

      const created = queryOne(`SELECT id, company_id, name, email, role, active, created_at FROM users WHERE id = ?`, [id]);
      return res.status(201).json(created);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/users/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { company_id, name, email, password, role, active } = req.body;

      if (role === 'DEV') {
        return res.status(400).json({ error: 'O perfil DEV é independente e não pode ser vinculado a nenhuma empresa.' });
      }

      if (password && password.trim().length > 0) {
        runSql(
          `UPDATE users SET company_id = ?, name = ?, email = ?, password = ?, role = ?, active = ? WHERE id = ?`,
          [company_id, name, email.trim().toLowerCase(), password, role, active !== undefined ? active : 1, id]
        );
      } else {
        runSql(
          `UPDATE users SET company_id = ?, name = ?, email = ?, role = ?, active = ? WHERE id = ?`,
          [company_id, name, email.trim().toLowerCase(), role, active !== undefined ? active : 1, id]
        );
      }

      const updated = queryOne(`SELECT id, company_id, name, email, role, active, created_at FROM users WHERE id = ?`, [id]);
      return res.json(updated);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/users/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      runSql(`DELETE FROM users WHERE id = ?`, [id]);
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/users/:id/reset-password', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { password } = req.body;
      if (!password || password.trim().length === 0) {
        return res.status(400).json({ error: 'Nova senha é obrigatória.' });
      }

      const existing = queryOne(`SELECT id, email, name FROM users WHERE id = ?`, [id]);
      if (!existing) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }

      runSql(`UPDATE users SET password = ? WHERE id = ?`, [password.trim(), id]);
      return res.json({ success: true, message: 'Senha recuperada e atualizada com sucesso.' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.patch('/api/users/:id/status', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { active } = req.body;
      if (active === undefined) {
        return res.status(400).json({ error: 'Status active é obrigatório.' });
      }

      const existing = queryOne(`SELECT id, email, name FROM users WHERE id = ?`, [id]);
      if (!existing) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }

      const newStatus = active ? 1 : 0;
      runSql(`UPDATE users SET active = ? WHERE id = ?`, [newStatus, id]);
      const updated = queryOne(`SELECT id, company_id, name, email, role, active, created_at FROM users WHERE id = ?`, [id]);
      return res.json(updated);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Media upload for company logos and documents
  app.post('/api/upload-media', (req: Request, res: Response) => {
    try {
      const { base64, filename } = req.body;
      if (!base64) {
        return res.status(400).json({ error: 'Nenhum dado de mídia fornecido.' });
      }

      const matches = base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      let buffer: Buffer;
      let extension = 'png';

      if (matches && matches.length === 3) {
        const mime = matches[1];
        if (mime.includes('jpeg') || mime.includes('jpg')) extension = 'jpg';
        else if (mime.includes('png')) extension = 'png';
        else if (mime.includes('webp')) extension = 'webp';
        else if (mime.includes('svg')) extension = 'svg';
        buffer = Buffer.from(matches[2], 'base64');
      } else {
        buffer = Buffer.from(base64, 'base64');
      }

      const cleanFilename = `logo-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${extension}`;
      const filePath = path.join(uploadsDir, cleanFilename);
      fs.writeFileSync(filePath, buffer);

      const fileUrl = `/uploads/${cleanFilename}`;
      return res.json({
        url: fileUrl,
        base64: base64.startsWith('data:') ? base64 : `data:image/${extension};base64,${base64}`
      });
    } catch (err: any) {
      console.error('Error uploading media:', err);
      return res.status(500).json({ error: 'Erro ao processar mídia: ' + err.message });
    }
  });

  // ==========================================
  // TECHNICIANS ROUTES
  // ==========================================
  app.get('/api/technicians', (req: Request, res: Response) => {
    try {
      const { companyId, userRole } = req.query;
      let technicians;
      if (userRole === 'DEV' && !companyId) {
        technicians = queryAll(`
          SELECT t.*, c.name as company_name
          FROM technicians t
          LEFT JOIN companies c ON t.company_id = c.id
          ORDER BY t.name ASC
        `);
      } else {
        technicians = queryAll(`
          SELECT t.*, c.name as company_name
          FROM technicians t
          LEFT JOIN companies c ON t.company_id = c.id
          WHERE t.company_id = ?
          ORDER BY t.name ASC
        `, [companyId || '']);
      }
      return res.json(technicians);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/technicians', (req: Request, res: Response) => {
    try {
      const { company_id, name, phone, email, role_title } = req.body;
      if (!name || !company_id) {
        return res.status(400).json({ error: 'Nome e empresa são obrigatórios.' });
      }

      const id = `tec-${Date.now()}`;
      const now = new Date().toISOString();
      runSql(
        `INSERT INTO technicians (id, company_id, name, phone, email, role_title, active, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
        [id, company_id, name, phone || '', email || '', role_title || '', now]
      );

      const created = queryOne(`SELECT * FROM technicians WHERE id = ?`, [id]);
      return res.status(201).json(created);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/technicians/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, phone, email, role_title, active } = req.body;

      runSql(
        `UPDATE technicians SET name = ?, phone = ?, email = ?, role_title = ?, active = ? WHERE id = ?`,
        [name, phone, email, role_title, active !== undefined ? active : 1, id]
      );

      const updated = queryOne(`SELECT * FROM technicians WHERE id = ?`, [id]);
      return res.json(updated);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/technicians/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      runSql(`DELETE FROM technicians WHERE id = ?`, [id]);
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // CLIENTS ROUTES
  // ==========================================
  app.get('/api/clients', (req: Request, res: Response) => {
    try {
      const { companyId, userRole } = req.query;
      let clients;
      if (userRole === 'DEV' && !companyId) {
        clients = queryAll(`
          SELECT c.*, comp.name as company_name
          FROM clients c
          LEFT JOIN companies comp ON c.company_id = comp.id
          ORDER BY c.name ASC
        `);
      } else {
        clients = queryAll(`
          SELECT c.*, comp.name as company_name
          FROM clients c
          LEFT JOIN companies comp ON c.company_id = comp.id
          WHERE c.company_id = ?
          ORDER BY c.name ASC
        `, [companyId || '']);
      }
      return res.json(clients);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/clients', (req: Request, res: Response) => {
    try {
      const { company_id, name, document, email, phone, address, city, state, notes } = req.body;
      if (!name || !company_id) {
        return res.status(400).json({ error: 'Nome e empresa são obrigatórios.' });
      }

      const id = `cli-${Date.now()}`;
      const now = new Date().toISOString();
      runSql(
        `INSERT INTO clients (id, company_id, name, document, email, phone, address, city, state, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, company_id, name, document || '', email || '', phone || '', address || '', city || '', state || '', notes || '', now]
      );

      const created = queryOne(`SELECT * FROM clients WHERE id = ?`, [id]);
      return res.status(201).json(created);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/clients/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, document, email, phone, address, city, state, notes } = req.body;

      runSql(
        `UPDATE clients SET name = ?, document = ?, email = ?, phone = ?, address = ?, city = ?, state = ?, notes = ? WHERE id = ?`,
        [name, document, email, phone, address, city, state, notes, id]
      );

      const updated = queryOne(`SELECT * FROM clients WHERE id = ?`, [id]);
      return res.json(updated);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/clients/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      runSql(`DELETE FROM clients WHERE id = ?`, [id]);
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // QUOTES (ORÇAMENTOS) ROUTES
  // ==========================================
  app.get('/api/quotes', (req: Request, res: Response) => {
    try {
      const { companyId, userRole, status, search } = req.query;

      let sql = `
        SELECT q.*,
               c.name as client_name, c.phone as client_phone, c.email as client_email,
               t.name as technician_name,
               comp.name as company_name,
               (SELECT count(*) FROM quote_items WHERE quote_id = q.id) as items_count,
               (SELECT count(*) FROM quote_photos WHERE quote_id = q.id) as photos_count
        FROM quotes q
        LEFT JOIN clients c ON q.client_id = c.id
        LEFT JOIN technicians t ON q.technician_id = t.id
        LEFT JOIN companies comp ON q.company_id = comp.id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (companyId && companyId !== 'ALL') {
        sql += ` AND q.company_id = ?`;
        params.push(companyId);
      }

      if (status && status !== 'ALL') {
        sql += ` AND q.status = ?`;
        params.push(status);
      }

      if (search) {
        sql += ` AND (c.name LIKE ? OR q.description LIKE ? OR CAST(q.quote_number AS TEXT) LIKE ?)`;
        const s = `%${search}%`;
        params.push(s, s, s);
      }

      sql += ` ORDER BY q.quote_number DESC`;

      const quotes = queryAll(sql, params);
      return res.json(quotes);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/quotes/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const quote = queryOne(`
        SELECT q.*,
               c.name as client_name, c.document as client_document, c.phone as client_phone, c.email as client_email, c.address as client_address,
               t.name as technician_name, t.phone as technician_phone, t.role_title as technician_role
        FROM quotes q
        LEFT JOIN clients c ON q.client_id = c.id
        LEFT JOIN technicians t ON q.technician_id = t.id
        WHERE q.id = ?
      `, [id]);

      if (!quote) return res.status(404).json({ error: 'Orçamento não encontrado.' });

      const items = queryAll(`SELECT * FROM quote_items WHERE quote_id = ? ORDER BY id ASC`, [id]);
      const photos = queryAll(`SELECT * FROM quote_photos WHERE quote_id = ? ORDER BY created_at ASC`, [id]);
      const company = queryOne(`SELECT * FROM companies WHERE id = ?`, [quote.company_id]);

      return res.json({
        ...quote,
        items,
        photos,
        company
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/quotes', (req: Request, res: Response) => {
    try {
      const {
        company_id,
        client_id,
        technician_id,
        created_by,
        date,
        validity_date,
        status,
        description,
        address,
        discount,
        addition,
        notes,
        items,
        photos
      } = req.body;

      if (!company_id || !client_id || !description) {
        return res.status(400).json({ error: 'Empresa, cliente e descrição são obrigatórios.' });
      }

      // Generate sequential quote number per company
      const lastQuote = queryOne(`SELECT max(quote_number) as max_num FROM quotes WHERE company_id = ?`, [company_id]);
      const nextNumber = (lastQuote?.max_num || 1000) + 1;

      const id = `quote-${Date.now()}`;
      const now = new Date().toISOString();

      // Recalculate values from items
      let subtotal = 0;
      const parsedItems = Array.isArray(items) ? items : [];
      parsedItems.forEach((item: any) => {
        const qty = Number(item.quantity) || 1;
        const price = Number(item.unit_price) || 0;
        subtotal += qty * price;
      });

      const numDiscount = Number(discount) || 0;
      const numAddition = Number(addition) || 0;
      const total = Math.max(0, subtotal + numAddition - numDiscount);

      runSql(
        `INSERT INTO quotes (id, company_id, quote_number, client_id, technician_id, created_by, date, validity_date, status, description, address, subtotal, discount, addition, total, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          company_id,
          nextNumber,
          client_id,
          technician_id || null,
          created_by || 'Sistema',
          date || now.split('T')[0],
          validity_date || null,
          status || 'Rascunho',
          description,
          address || '',
          subtotal,
          numDiscount,
          numAddition,
          total,
          notes || '',
          now,
          now
        ]
      );

      // Insert items
      parsedItems.forEach((item: any, idx: number) => {
        const itemId = `qi-${Date.now()}-${idx}`;
        const qty = Number(item.quantity) || 1;
        const unitPrice = Number(item.unit_price) || 0;
        const itemTotal = qty * unitPrice;
        runSql(
          `INSERT INTO quote_items (id, quote_id, item_type, description, quantity, unit, unit_price, total_price)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [itemId, id, item.item_type || 'servico', item.description || '', qty, item.unit || 'UN', unitPrice, itemTotal]
        );
      });

      // Insert photos (verified vertical)
      const parsedPhotos = Array.isArray(photos) ? photos : [];
      parsedPhotos.forEach((photo: any, idx: number) => {
        const photoId = `qp-${Date.now()}-${idx}`;
        runSql(
          `INSERT INTO quote_photos (id, quote_id, company_id, url, caption, width, height, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [photoId, id, company_id, photo.url, photo.caption || '', photo.width || 600, photo.height || 900, now]
        );
      });

      // Create notification log
      const client = queryOne(`SELECT name FROM clients WHERE id = ?`, [client_id]);
      runSql(
        `INSERT INTO notifications (id, company_id, title, message, channel, recipient, status, created_at)
         VALUES (?, ?, ?, ?, 'system', '', 'sent', ?)`,
        [`notif-${Date.now()}`, company_id, `Novo Orçamento #${nextNumber} Criado`, `Orçamento para ${client?.name || 'Cliente'} no valor de R$ ${total.toFixed(2)} gerado com sucesso.`, now]
      );

      return res.status(201).json({ id, quote_number: nextNumber, total, message: 'Orçamento criado com sucesso!' });
    } catch (err: any) {
      console.error('Error creating quote:', err);
      return res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/quotes/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const {
        client_id,
        technician_id,
        date,
        validity_date,
        status,
        description,
        address,
        discount,
        addition,
        notes,
        items,
        photos
      } = req.body;

      const existing = queryOne(`SELECT * FROM quotes WHERE id = ?`, [id]);
      if (!existing) return res.status(404).json({ error: 'Orçamento não encontrado.' });

      // Recalculate values from items
      let subtotal = 0;
      const parsedItems = Array.isArray(items) ? items : [];
      parsedItems.forEach((item: any) => {
        const qty = Number(item.quantity) || 1;
        const price = Number(item.unit_price) || 0;
        subtotal += qty * price;
      });

      const numDiscount = Number(discount) || 0;
      const numAddition = Number(addition) || 0;
      const total = Math.max(0, subtotal + numAddition - numDiscount);
      const now = new Date().toISOString();

      runSql(
        `UPDATE quotes SET
           client_id = ?,
           technician_id = ?,
           date = ?,
           validity_date = ?,
           status = ?,
           description = ?,
           address = ?,
           subtotal = ?,
           discount = ?,
           addition = ?,
           total = ?,
           notes = ?,
           updated_at = ?
         WHERE id = ?`,
        [
          client_id || existing.client_id,
          technician_id || existing.technician_id,
          date || existing.date,
          validity_date,
          status || existing.status,
          description || existing.description,
          address,
          subtotal,
          numDiscount,
          numAddition,
          total,
          notes,
          now,
          id
        ]
      );

      // Re-synchronize items
      runSql(`DELETE FROM quote_items WHERE quote_id = ?`, [id]);
      parsedItems.forEach((item: any, idx: number) => {
        const itemId = `qi-${Date.now()}-${idx}`;
        const qty = Number(item.quantity) || 1;
        const unitPrice = Number(item.unit_price) || 0;
        const itemTotal = qty * unitPrice;
        runSql(
          `INSERT INTO quote_items (id, quote_id, item_type, description, quantity, unit, unit_price, total_price)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [itemId, id, item.item_type || 'servico', item.description || '', qty, item.unit || 'UN', unitPrice, itemTotal]
        );
      });

      // If photos were updated
      if (Array.isArray(photos)) {
        runSql(`DELETE FROM quote_photos WHERE quote_id = ?`, [id]);
        photos.forEach((photo: any, idx: number) => {
          const photoId = `qp-${Date.now()}-${idx}`;
          runSql(
            `INSERT INTO quote_photos (id, quote_id, company_id, url, caption, width, height, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [photoId, id, existing.company_id, photo.url, photo.caption || '', photo.width || 600, photo.height || 900, now]
          );
        });
      }

      return res.json({ success: true, total, message: 'Orçamento atualizado com recálculo automático com sucesso!' });
    } catch (err: any) {
      console.error('Error updating quote:', err);
      return res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/quotes/:id/duplicate', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const original = queryOne(`SELECT * FROM quotes WHERE id = ?`, [id]);
      if (!original) return res.status(404).json({ error: 'Orçamento não encontrado.' });

      const lastQuote = queryOne(`SELECT max(quote_number) as max_num FROM quotes WHERE company_id = ?`, [original.company_id]);
      const nextNumber = (lastQuote?.max_num || 1000) + 1;

      const newId = `quote-${Date.now()}`;
      const now = new Date().toISOString();

      runSql(
        `INSERT INTO quotes (id, company_id, quote_number, client_id, technician_id, created_by, date, validity_date, status, description, address, subtotal, discount, addition, total, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Rascunho', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newId,
          original.company_id,
          nextNumber,
          original.client_id,
          original.technician_id,
          original.created_by,
          now.split('T')[0],
          original.validity_date,
          `CÓPIA: ${original.description}`,
          original.address,
          original.subtotal,
          original.discount,
          original.addition,
          original.total,
          original.notes,
          now,
          now
        ]
      );

      // Copy items
      const items = queryAll(`SELECT * FROM quote_items WHERE quote_id = ?`, [id]);
      items.forEach((item, idx) => {
        runSql(
          `INSERT INTO quote_items (id, quote_id, item_type, description, quantity, unit, unit_price, total_price)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [`qi-${Date.now()}-${idx}`, newId, item.item_type, item.description, item.quantity, item.unit, item.unit_price, item.total_price]
        );
      });

      // Copy photos
      const photos = queryAll(`SELECT * FROM quote_photos WHERE quote_id = ?`, [id]);
      photos.forEach((photo, idx) => {
        runSql(
          `INSERT INTO quote_photos (id, quote_id, company_id, url, caption, width, height, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [`qp-${Date.now()}-${idx}`, newId, photo.company_id, photo.url, photo.caption, photo.width, photo.height, now]
        );
      });

      return res.status(201).json({ id: newId, quote_number: nextNumber, message: 'Orçamento duplicado com sucesso!' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/quotes/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      runSql(`DELETE FROM quote_photos WHERE quote_id = ?`, [id]);
      runSql(`DELETE FROM quote_items WHERE quote_id = ?`, [id]);
      runSql(`DELETE FROM quotes WHERE id = ?`, [id]);
      return res.json({ success: true, message: 'Orçamento excluído com sucesso.' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // WORK ORDERS (ORDENS DE SERVIÇO) ROUTES
  // ==========================================
  app.get('/api/work-orders', (req: Request, res: Response) => {
    try {
      const { companyId, userRole, status, search, technicianId } = req.query;

      let sql = `
        SELECT wo.*,
               c.name as client_name, c.phone as client_phone, c.email as client_email,
               t.name as technician_name,
               comp.name as company_name,
               (SELECT count(*) FROM work_order_items WHERE work_order_id = wo.id) as items_count,
               (SELECT count(*) FROM work_order_photos WHERE work_order_id = wo.id) as photos_count
        FROM work_orders wo
        LEFT JOIN clients c ON wo.client_id = c.id
        LEFT JOIN technicians t ON wo.technician_id = t.id
        LEFT JOIN companies comp ON wo.company_id = comp.id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (companyId && companyId !== 'ALL') {
        sql += ` AND wo.company_id = ?`;
        params.push(companyId);
      }

      if (status && status !== 'ALL') {
        sql += ` AND wo.status = ?`;
        params.push(status);
      }

      if (technicianId) {
        sql += ` AND wo.technician_id = ?`;
        params.push(technicianId);
      }

      if (search) {
        sql += ` AND (c.name LIKE ? OR wo.service_description LIKE ? OR CAST(wo.order_number AS TEXT) LIKE ?)`;
        const s = `%${search}%`;
        params.push(s, s, s);
      }

      sql += ` ORDER BY wo.order_number DESC`;

      const orders = queryAll(sql, params);
      return res.json(orders);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/work-orders/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const order = queryOne(`
        SELECT wo.*,
               c.name as client_name, c.document as client_document, c.phone as client_phone, c.email as client_email, c.address as client_address,
               t.name as technician_name, t.phone as technician_phone, t.role_title as technician_role
        FROM work_orders wo
        LEFT JOIN clients c ON wo.client_id = c.id
        LEFT JOIN technicians t ON wo.technician_id = t.id
        WHERE wo.id = ?
      `, [id]);

      if (!order) return res.status(404).json({ error: 'Ordem de Serviço não encontrada.' });

      const items = queryAll(`SELECT * FROM work_order_items WHERE work_order_id = ? ORDER BY id ASC`, [id]);
      const photos = queryAll(`SELECT * FROM work_order_photos WHERE work_order_id = ? ORDER BY created_at ASC`, [id]);
      const company = queryOne(`SELECT * FROM companies WHERE id = ?`, [order.company_id]);

      return res.json({
        ...order,
        items,
        photos,
        company
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/work-orders', (req: Request, res: Response) => {
    try {
      const {
        company_id,
        quote_id,
        client_id,
        technician_id,
        created_by,
        date,
        status,
        service_description,
        address,
        discount,
        addition,
        notes,
        client_signature,
        client_signed_at,
        technician_signature,
        technician_signed_at,
        items,
        photos
      } = req.body;

      if (!company_id || !client_id || !technician_id || !service_description) {
        return res.status(400).json({ error: 'Empresa, cliente, técnico e descrição do serviço são obrigatórios.' });
      }

      const lastOrder = queryOne(`SELECT max(order_number) as max_num FROM work_orders WHERE company_id = ?`, [company_id]);
      const nextNumber = (lastOrder?.max_num || 2000) + 1;

      const id = `wo-${Date.now()}`;
      const now = new Date().toISOString();

      let subtotal = 0;
      const parsedItems = Array.isArray(items) ? items : [];
      parsedItems.forEach((item: any) => {
        const qty = Number(item.quantity) || 1;
        const price = Number(item.unit_price) || 0;
        subtotal += qty * price;
      });

      const numDiscount = Number(discount) || 0;
      const numAddition = Number(addition) || 0;
      const total = Math.max(0, subtotal + numAddition - numDiscount);

      runSql(
        `INSERT INTO work_orders (id, company_id, order_number, quote_id, client_id, technician_id, created_by, date, status, service_description, address, subtotal, discount, addition, total, notes, client_signature, client_signed_at, technician_signature, technician_signed_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          company_id,
          nextNumber,
          quote_id || null,
          client_id,
          technician_id,
          created_by || 'Sistema',
          date || now.split('T')[0],
          status || 'Aberta',
          service_description,
          address || '',
          subtotal,
          numDiscount,
          numAddition,
          total,
          notes || '',
          client_signature || null,
          client_signed_at || (client_signature ? now : null),
          technician_signature || null,
          technician_signed_at || (technician_signature ? now : null),
          now,
          now
        ]
      );

      parsedItems.forEach((item: any, idx: number) => {
        const itemId = `woi-${Date.now()}-${idx}`;
        const qty = Number(item.quantity) || 1;
        const unitPrice = Number(item.unit_price) || 0;
        const itemTotal = qty * unitPrice;
        runSql(
          `INSERT INTO work_order_items (id, work_order_id, item_type, description, quantity, unit, unit_price, total_price)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [itemId, id, item.item_type || 'servico', item.description || '', qty, item.unit || 'UN', unitPrice, itemTotal]
        );
      });

      const parsedPhotos = Array.isArray(photos) ? photos : [];
      parsedPhotos.forEach((photo: any, idx: number) => {
        const photoId = `wop-${Date.now()}-${idx}`;
        runSql(
          `INSERT INTO work_order_photos (id, work_order_id, company_id, url, caption, width, height, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [photoId, id, company_id, photo.url, photo.caption || '', photo.width || 600, photo.height || 900, now]
        );
      });

      // Notification
      const tech = queryOne(`SELECT name FROM technicians WHERE id = ?`, [technician_id]);
      runSql(
        `INSERT INTO notifications (id, company_id, title, message, channel, recipient, status, created_at)
         VALUES (?, ?, ?, ?, 'system', '', 'sent', ?)`,
        [`notif-${Date.now()}`, company_id, `Nova OS #${nextNumber} Criada`, `Atribuída ao técnico ${tech?.name || 'Designado'} no valor de R$ ${total.toFixed(2)}.`, now]
      );

      return res.status(201).json({ id, order_number: nextNumber, total, message: 'Ordem de Serviço criada com sucesso!' });
    } catch (err: any) {
      console.error('Error creating work order:', err);
      return res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/work-orders/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const {
        client_id,
        technician_id,
        date,
        status,
        service_description,
        address,
        discount,
        addition,
        notes,
        client_signature,
        client_signed_at,
        technician_signature,
        technician_signed_at,
        items,
        photos
      } = req.body;

      const existing = queryOne(`SELECT * FROM work_orders WHERE id = ?`, [id]);
      if (!existing) return res.status(404).json({ error: 'Ordem de Serviço não encontrada.' });

      let subtotal = 0;
      const parsedItems = Array.isArray(items) ? items : [];
      parsedItems.forEach((item: any) => {
        const qty = Number(item.quantity) || 1;
        const price = Number(item.unit_price) || 0;
        subtotal += qty * price;
      });

      const numDiscount = Number(discount) || 0;
      const numAddition = Number(addition) || 0;
      const total = Math.max(0, subtotal + numAddition - numDiscount);
      const now = new Date().toISOString();

      runSql(
        `UPDATE work_orders SET
           client_id = ?,
           technician_id = ?,
           date = ?,
           status = ?,
           service_description = ?,
           address = ?,
           subtotal = ?,
           discount = ?,
           addition = ?,
           total = ?,
           notes = ?,
           client_signature = COALESCE(?, client_signature),
           client_signed_at = COALESCE(?, client_signed_at),
           technician_signature = COALESCE(?, technician_signature),
           technician_signed_at = COALESCE(?, technician_signed_at),
           updated_at = ?
         WHERE id = ?`,
        [
          client_id || existing.client_id,
          technician_id || existing.technician_id,
          date || existing.date,
          status || existing.status,
          service_description || existing.service_description,
          address,
          subtotal,
          numDiscount,
          numAddition,
          total,
          notes,
          client_signature !== undefined ? client_signature : existing.client_signature,
          client_signed_at !== undefined ? client_signed_at : (client_signature && !existing.client_signed_at ? now : existing.client_signed_at),
          technician_signature !== undefined ? technician_signature : existing.technician_signature,
          technician_signed_at !== undefined ? technician_signed_at : (technician_signature && !existing.technician_signed_at ? now : existing.technician_signed_at),
          now,
          id
        ]
      );

      runSql(`DELETE FROM work_order_items WHERE work_order_id = ?`, [id]);
      parsedItems.forEach((item: any, idx: number) => {
        const itemId = `woi-${Date.now()}-${idx}`;
        const qty = Number(item.quantity) || 1;
        const unitPrice = Number(item.unit_price) || 0;
        const itemTotal = qty * unitPrice;
        runSql(
          `INSERT INTO work_order_items (id, work_order_id, item_type, description, quantity, unit, unit_price, total_price)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [itemId, id, item.item_type || 'servico', item.description || '', qty, item.unit || 'UN', unitPrice, itemTotal]
        );
      });

      if (Array.isArray(photos)) {
        runSql(`DELETE FROM work_order_photos WHERE work_order_id = ?`, [id]);
        photos.forEach((photo: any, idx: number) => {
          const photoId = `wop-${Date.now()}-${idx}`;
          runSql(
            `INSERT INTO work_order_photos (id, work_order_id, company_id, url, caption, width, height, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [photoId, id, existing.company_id, photo.url, photo.caption || '', photo.width || 600, photo.height || 900, now]
          );
        });
      }

      return res.json({ success: true, total, message: 'Ordem de Serviço atualizada com sucesso!' });
    } catch (err: any) {
      console.error('Error updating work order:', err);
      return res.status(500).json({ error: err.message });
    }
  });

  // Dedicated endpoint for fast mobile digital signature collection
  app.post('/api/work-orders/:id/signature', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { client_signature, client_signed_at, technician_signature, technician_signed_at } = req.body;
      const existing = queryOne(`SELECT * FROM work_orders WHERE id = ?`, [id]);
      if (!existing) return res.status(404).json({ error: 'Ordem de Serviço não encontrada.' });

      const now = new Date().toISOString();
      const updatedClientSig = client_signature !== undefined ? client_signature : existing.client_signature;
      const updatedClientTime = client_signed_at !== undefined ? client_signed_at : (client_signature ? now : existing.client_signed_at);
      const updatedTechSig = technician_signature !== undefined ? technician_signature : existing.technician_signature;
      const updatedTechTime = technician_signed_at !== undefined ? technician_signed_at : (technician_signature ? now : existing.technician_signed_at);

      runSql(
        `UPDATE work_orders SET
           client_signature = ?,
           client_signed_at = ?,
           technician_signature = ?,
           technician_signed_at = ?,
           updated_at = ?
         WHERE id = ?`,
        [updatedClientSig, updatedClientTime, updatedTechSig, updatedTechTime, now, id]
      );

      return res.json({
        success: true,
        message: 'Assinatura registrada com sucesso!',
        client_signature: updatedClientSig,
        client_signed_at: updatedClientTime,
        technician_signature: updatedTechSig,
        technician_signed_at: updatedTechTime
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/quotes/:id/signature', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { client_signature, client_signed_at } = req.body;
      const existing = queryOne(`SELECT * FROM quotes WHERE id = ?`, [id]);
      if (!existing) return res.status(404).json({ error: 'Orçamento não encontrado.' });

      const now = new Date().toISOString();
      const updatedSig = client_signature !== undefined ? client_signature : existing.client_signature;
      const updatedTime = client_signed_at !== undefined ? client_signed_at : (client_signature ? now : existing.client_signed_at);

      runSql(
        `UPDATE quotes SET
           client_signature = ?,
           client_signed_at = ?,
           updated_at = ?
         WHERE id = ?`,
        [updatedSig, updatedTime, now, id]
      );

      return res.json({
        success: true,
        message: 'Assinatura registrada com sucesso!',
        client_signature: updatedSig,
        client_signed_at: updatedTime
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/work-orders/:id/duplicate', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const original = queryOne(`SELECT * FROM work_orders WHERE id = ?`, [id]);
      if (!original) return res.status(404).json({ error: 'Ordem de Serviço não encontrada.' });

      const lastOrder = queryOne(`SELECT max(order_number) as max_num FROM work_orders WHERE company_id = ?`, [original.company_id]);
      const nextNumber = (lastOrder?.max_num || 2000) + 1;

      const newId = `wo-${Date.now()}`;
      const now = new Date().toISOString();

      runSql(
        `INSERT INTO work_orders (id, company_id, order_number, quote_id, client_id, technician_id, created_by, date, status, service_description, address, subtotal, discount, addition, total, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Aberta', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newId,
          original.company_id,
          nextNumber,
          original.quote_id,
          original.client_id,
          original.technician_id,
          original.created_by,
          now.split('T')[0],
          `CÓPIA: ${original.service_description}`,
          original.address,
          original.subtotal,
          original.discount,
          original.addition,
          original.total,
          original.notes,
          now,
          now
        ]
      );

      const items = queryAll(`SELECT * FROM work_order_items WHERE work_order_id = ?`, [id]);
      items.forEach((item, idx) => {
        runSql(
          `INSERT INTO work_order_items (id, work_order_id, item_type, description, quantity, unit, unit_price, total_price)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [`woi-${Date.now()}-${idx}`, newId, item.item_type, item.description, item.quantity, item.unit, item.unit_price, item.total_price]
        );
      });

      const photos = queryAll(`SELECT * FROM work_order_photos WHERE work_order_id = ?`, [id]);
      photos.forEach((photo, idx) => {
        runSql(
          `INSERT INTO work_order_photos (id, work_order_id, company_id, url, caption, width, height, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [`wop-${Date.now()}-${idx}`, newId, photo.company_id, photo.url, photo.caption, photo.width, photo.height, now]
        );
      });

      return res.status(201).json({ id: newId, order_number: nextNumber, message: 'Ordem de Serviço duplicada com sucesso!' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/work-orders/from-quote/:quoteId', (req: Request, res: Response) => {
    try {
      const { quoteId } = req.params;
      const quote = queryOne(`SELECT * FROM quotes WHERE id = ?`, [quoteId]);
      if (!quote) return res.status(404).json({ error: 'Orçamento não encontrado.' });

      const lastOrder = queryOne(`SELECT max(order_number) as max_num FROM work_orders WHERE company_id = ?`, [quote.company_id]);
      const nextNumber = (lastOrder?.max_num || 2000) + 1;

      const newId = `wo-${Date.now()}`;
      const now = new Date().toISOString();

      // Find first technician of company if quote technician is null
      let techId = quote.technician_id;
      if (!techId) {
        const firstTech = queryOne(`SELECT id FROM technicians WHERE company_id = ? AND active = 1 LIMIT 1`, [quote.company_id]);
        techId = firstTech ? firstTech.id : 'tec-1';
      }

      runSql(
        `INSERT INTO work_orders (id, company_id, order_number, quote_id, client_id, technician_id, created_by, date, status, service_description, address, subtotal, discount, addition, total, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Aberta', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newId,
          quote.company_id,
          nextNumber,
          quote.id,
          quote.client_id,
          techId,
          quote.created_by,
          now.split('T')[0],
          `Execução referente ao Orçamento #${quote.quote_number}: ${quote.description}`,
          quote.address,
          quote.subtotal,
          quote.discount,
          quote.addition,
          quote.total,
          quote.notes,
          now,
          now
        ]
      );

      // Copy items
      const items = queryAll(`SELECT * FROM quote_items WHERE quote_id = ?`, [quoteId]);
      items.forEach((item, idx) => {
        runSql(
          `INSERT INTO work_order_items (id, work_order_id, item_type, description, quantity, unit, unit_price, total_price)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [`woi-${Date.now()}-${idx}`, newId, item.item_type, item.description, item.quantity, item.unit, item.unit_price, item.total_price]
        );
      });

      // Copy photos
      const photos = queryAll(`SELECT * FROM quote_photos WHERE quote_id = ?`, [quoteId]);
      photos.forEach((photo, idx) => {
        runSql(
          `INSERT INTO work_order_photos (id, work_order_id, company_id, url, caption, width, height, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [`wop-${Date.now()}-${idx}`, newId, photo.company_id, photo.url, photo.caption, photo.width, photo.height, now]
        );
      });

      // Mark quote as approved
      runSql(`UPDATE quotes SET status = 'Aprovado' WHERE id = ?`, [quoteId]);

      return res.status(201).json({ id: newId, order_number: nextNumber, message: 'Ordem de Serviço gerada a partir do orçamento!' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/work-orders/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      runSql(`DELETE FROM work_order_photos WHERE work_order_id = ?`, [id]);
      runSql(`DELETE FROM work_order_items WHERE work_order_id = ?`, [id]);
      runSql(`DELETE FROM work_orders WHERE id = ?`, [id]);
      return res.json({ success: true, message: 'Ordem de Serviço excluída com sucesso.' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // MANDATORY VERTICAL PHOTO UPLOAD & VALIDATION
  // ==========================================
  app.post('/api/upload', (req: Request, res: Response) => {
    try {
      const { image, width, height, company_id, caption } = req.body;

      if (!image) {
        return res.status(400).json({ error: 'Nenhuma imagem foi enviada.' });
      }

      const imgWidth = Number(width);
      const imgHeight = Number(height);

      // STRICT VERTICAL ORIENTATION VALIDATION RULE
      // width must be strictly less than height
      if (imgWidth && imgHeight && imgWidth >= imgHeight) {
        return res.status(400).json({
          error: `FOTO REJEITADA: A imagem está em orientação HORIZONTAL (${imgWidth}x${imgHeight}px). O padrão CAST Quote OBRIGA que todas as fotos sejam estritamente VERTICAIS (Retrato). Por favor, posicione o dispositivo na vertical e capture novamente.`
        });
      }

      // Check base64 format
      let fileData: Buffer;
      let extension = 'jpg';
      let mimeType = 'image/jpeg';

      if (image.startsWith('data:image/svg+xml')) {
        extension = 'svg';
        mimeType = 'image/svg+xml';
        const base64Data = image.replace(/^data:image\/svg\+xml;base64,/, '');
        fileData = Buffer.from(base64Data, 'base64');
      } else if (image.startsWith('data:image/png')) {
        extension = 'png';
        mimeType = 'image/png';
        const base64Data = image.replace(/^data:image\/png;base64,/, '');
        fileData = Buffer.from(base64Data, 'base64');
      } else if (image.startsWith('data:image/jpeg') || image.startsWith('data:image/jpg')) {
        extension = 'jpg';
        mimeType = 'image/jpeg';
        const base64Data = image.replace(/^data:image\/jpeg;base64,/, '').replace(/^data:image\/jpg;base64,/, '');
        fileData = Buffer.from(base64Data, 'base64');
      } else if (image.startsWith('data:image/webp')) {
        extension = 'webp';
        mimeType = 'image/webp';
        const base64Data = image.replace(/^data:image\/webp;base64,/, '');
        fileData = Buffer.from(base64Data, 'base64');
      } else {
        // Raw base64 or plain string
        fileData = Buffer.from(image, 'base64');
      }

      const companyFolder = path.join(uploadsDir, company_id ? String(company_id) : 'default');
      if (!fs.existsSync(companyFolder)) {
        fs.mkdirSync(companyFolder, { recursive: true });
      }

      const filename = `photo-${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;
      const filePath = path.join(companyFolder, filename);
      fs.writeFileSync(filePath, fileData);

      const publicUrl = `/uploads/${company_id ? String(company_id) : 'default'}/${filename}`;

      return res.status(201).json({
        success: true,
        url: publicUrl,
        width: imgWidth || 600,
        height: imgHeight || 900,
        caption: caption || ''
      });
    } catch (err: any) {
      console.error('Upload error:', err);
      return res.status(500).json({ error: 'Erro ao processar o upload da foto: ' + err.message });
    }
  });

  // ==========================================
  // DASHBOARD STATS
  // ==========================================
  app.get('/api/dashboard/stats', (req: Request, res: Response) => {
    try {
      const { companyId, userRole } = req.query;
      const isDevAll = userRole === 'DEV' && !companyId;

      let quotesWhere = isDevAll ? '' : 'WHERE company_id = ?';
      let ordersWhere = isDevAll ? '' : 'WHERE company_id = ?';
      let clientsWhere = isDevAll ? '' : 'WHERE company_id = ?';
      let techsWhere = isDevAll ? '' : 'WHERE company_id = ?';

      let recentQuotesWhere = isDevAll ? '' : 'WHERE q.company_id = ?';
      let recentOrdersWhere = isDevAll ? '' : 'WHERE wo.company_id = ?';

      const qParams = isDevAll ? [] : [companyId || ''];
      const oParams = isDevAll ? [] : [companyId || ''];
      const cParams = isDevAll ? [] : [companyId || ''];
      const tParams = isDevAll ? [] : [companyId || ''];

      const quotesStats = queryOne(`
        SELECT count(*) as count, coalesce(sum(total), 0) as total FROM quotes ${quotesWhere}
      `, qParams);

      const ordersStats = queryOne(`
        SELECT count(*) as count, coalesce(sum(total), 0) as total FROM work_orders ${ordersWhere}
      `, oParams);

      const clientsStats = queryOne(`
        SELECT count(*) as count FROM clients ${clientsWhere}
      `, cParams);

      const techsStats = queryOne(`
        SELECT count(*) as count FROM technicians ${techsWhere}
      `, tParams);

      const companiesCount = queryOne(`SELECT count(*) as count FROM companies WHERE active = 1`);

      // Status distributions
      const quotesByStatus = queryAll(`
        SELECT status, count(*) as count FROM quotes ${quotesWhere} GROUP BY status
      `, qParams);
      const quotesStatusMap: Record<string, number> = {};
      quotesByStatus.forEach(r => { quotesStatusMap[r.status] = r.count; });

      const ordersByStatus = queryAll(`
        SELECT status, count(*) as count FROM work_orders ${ordersWhere} GROUP BY status
      `, oParams);
      const ordersStatusMap: Record<string, number> = {};
      ordersByStatus.forEach(r => { ordersStatusMap[r.status] = r.count; });

      // Recent 5 quotes
      const recentQuotes = queryAll(`
        SELECT q.*, c.name as client_name, t.name as technician_name
        FROM quotes q
        LEFT JOIN clients c ON q.client_id = c.id
        LEFT JOIN technicians t ON q.technician_id = t.id
        ${recentQuotesWhere}
        ORDER BY q.created_at DESC LIMIT 5
      `, qParams);

      // Recent 5 orders
      const recentOrders = queryAll(`
        SELECT wo.*, c.name as client_name, t.name as technician_name
        FROM work_orders wo
        LEFT JOIN clients c ON wo.client_id = c.id
        LEFT JOIN technicians t ON wo.technician_id = t.id
        ${recentOrdersWhere}
        ORDER BY wo.created_at DESC LIMIT 5
      `, oParams);

      return res.json({
        quotesCount: quotesStats?.count || 0,
        ordersCount: ordersStats?.count || 0,
        quotesTotal: quotesStats?.total || 0,
        ordersTotal: ordersStats?.total || 0,
        clientsCount: clientsStats?.count || 0,
        techniciansCount: techsStats?.count || 0,
        companiesCount: companiesCount?.count || 0,
        statusDistribution: {
          quotes: quotesStatusMap,
          orders: ordersStatusMap
        },
        recentQuotes,
        recentOrders
      });
    } catch (err: any) {
      console.error('Dashboard stats error:', err);
      return res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // NOTIFICATIONS (WHATSAPP, EMAIL, SYSTEM)
  // ==========================================
  app.get('/api/notifications', (req: Request, res: Response) => {
    try {
      const { companyId, userRole } = req.query;
      let notifs;
      if (userRole === 'DEV' && !companyId) {
        notifs = queryAll(`SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50`);
      } else {
        notifs = queryAll(`SELECT * FROM notifications WHERE company_id = ? ORDER BY created_at DESC LIMIT 50`, [companyId || '']);
      }
      return res.json(notifs);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/notifications', (req: Request, res: Response) => {
    try {
      const { company_id, title, message, channel, recipient } = req.body;
      const id = `notif-${Date.now()}`;
      const now = new Date().toISOString();

      runSql(
        `INSERT INTO notifications (id, company_id, title, message, channel, recipient, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'sent', ?)`,
        [id, company_id || 'default', title, message, channel || 'whatsapp', recipient || '', now]
      );

      return res.status(201).json({ success: true, id, message: 'Notificação registrada com sucesso!' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // WHATSAPP MESSAGING INTEGRATION & GATEWAY
  // ==========================================
  app.get('/api/whatsapp/settings', (req: Request, res: Response) => {
    try {
      const { companyId } = req.query;
      if (!companyId) return res.status(400).json({ error: 'companyId é obrigatório' });
      const settings = queryOne(`SELECT * FROM whatsapp_settings WHERE company_id = ?`, [companyId as string]);
      return res.json(settings || { mode: 'wa_me', api_url: '', api_key: '', instance_name: '' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/whatsapp/settings', (req: Request, res: Response) => {
    try {
      const { company_id, mode, api_url, api_key, instance_name } = req.body;
      if (!company_id) return res.status(400).json({ error: 'company_id é obrigatório' });

      const now = new Date().toISOString();
      const existing = queryOne(`SELECT id FROM whatsapp_settings WHERE company_id = ?`, [company_id]);

      if (existing) {
        runSql(
          `UPDATE whatsapp_settings 
           SET mode = ?, api_url = ?, api_key = ?, instance_name = ?, updated_at = ?
           WHERE company_id = ?`,
          [mode || 'wa_me', api_url || '', api_key || '', instance_name || '', now, company_id]
        );
      } else {
        const id = `ws-${Date.now()}`;
        runSql(
          `INSERT INTO whatsapp_settings (id, company_id, mode, api_url, api_key, instance_name, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, company_id, mode || 'wa_me', api_url || '', api_key || '', instance_name || '', now, now]
        );
      }

      return res.json({ success: true, message: 'Configurações de WhatsApp salvas com sucesso!' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/whatsapp/send', async (req: Request, res: Response) => {
    try {
      const {
        company_id,
        phone,
        message,
        document_type,
        document_number,
        mode: requestedMode,
        api_url: directUrl,
        api_key: directKey,
        instance_name: directInstance
      } = req.body;

      if (!phone || !message) {
        return res.status(400).json({ error: 'Telefone e mensagem são obrigatórios.' });
      }

      // Format raw phone number (Brazilian format: default +55 if 10 or 11 digits)
      const cleanPhone = phone.replace(/\D/g, '');
      const intNumber = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
      const waUrl = `https://wa.me/${intNumber}?text=${encodeURIComponent(message)}`;

      // Fetch company settings if not passed directly
      let mode = requestedMode;
      let apiUrl = directUrl;
      let apiKey = directKey;
      let instance = directInstance;

      if (!mode && company_id) {
        const savedSettings = queryOne(`SELECT * FROM whatsapp_settings WHERE company_id = ?`, [company_id]);
        if (savedSettings) {
          mode = savedSettings.mode;
          apiUrl = apiUrl || savedSettings.api_url;
          apiKey = apiKey || savedSettings.api_key;
          instance = instance || savedSettings.instance_name;
        }
      }

      mode = mode || 'wa_me';
      let apiSent = false;
      let apiResponseData: any = null;
      let apiError: string | null = null;

      // If External Messaging API is chosen and configured
      if (mode === 'api' && apiUrl) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 12000);

          // Support for popular WhatsApp Gateways (Evolution API, Z-API, Generic Webhooks)
          const headers: Record<string, string> = {
            'Content-Type': 'application/json'
          };
          if (apiKey) {
            headers['Authorization'] = `Bearer ${apiKey}`;
            headers['apikey'] = apiKey;
            headers['Client-Token'] = apiKey;
          }

          const payload = {
            number: intNumber,
            phone: intNumber,
            to: `${intNumber}@s.whatsapp.net`,
            text: message,
            message: message,
            instance: instance || undefined
          };

          const apiRes = await fetch(apiUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          if (apiRes.ok) {
            apiSent = true;
            try {
              apiResponseData = await apiRes.json();
            } catch {
              apiResponseData = { status: 'ok' };
            }
          } else {
            const errText = await apiRes.text();
            apiError = `Falha na API externa (${apiRes.status}): ${errText.slice(0, 200)}`;
          }
        } catch (fetchErr: any) {
          apiError = `Erro de conexão com a API de mensageria: ${fetchErr.message}`;
        }
      }

      // Log notification in database
      const notifId = `notif-ws-${Date.now()}`;
      const now = new Date().toISOString();
      const title = document_type && document_number
        ? `${document_type} #${document_number} enviado via WhatsApp`
        : 'Mensagem enviada via WhatsApp';

      runSql(
        `INSERT INTO notifications (id, company_id, title, message, channel, recipient, status, created_at)
         VALUES (?, ?, ?, ?, 'whatsapp', ?, ?, ?)`,
        [
          notifId,
          company_id || 'default',
          title,
          message,
          intNumber,
          apiSent ? 'sent_api' : 'prepared_wame',
          now
        ]
      );

      return res.json({
        success: true,
        mode,
        api_sent: apiSent,
        api_error: apiError,
        wa_url: waUrl,
        formatted_phone: intNumber,
        api_response: apiResponseData,
        message: apiSent
          ? 'Mensagem enviada com sucesso pela API externa!'
          : 'Resumo preparado para envio via WhatsApp (link wa.me).'
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // GOOGLE DRIVE EXPORT & CLOUD SYNC LOG
  // ==========================================
  app.post('/api/drive/sync', (req: Request, res: Response) => {
    try {
      const {
        company_id,
        document_type,
        document_number,
        title,
        file_url,
        client_name,
        folder_path,
        folder_url,
        file_id,
        photo_count,
        photos
      } = req.body;
      const now = new Date().toISOString();
      const id = `drive-${Date.now()}`;

      const clientText = client_name ? ` (Cliente: ${client_name})` : '';
      const photosText = photo_count ? ` e ${photo_count} fotos individuais com códigos únicos` : '';
      const pathText = folder_path ? ` no diretório "${folder_path}"` : '';

      // Record in notifications & cloud sync ledger
      runSql(
        `INSERT INTO notifications (id, company_id, title, message, channel, recipient, status, created_at)
         VALUES (?, ?, ?, ?, 'system', 'Google Drive Cloud', 'synced', ?)`,
        [
          id,
          company_id || 'default',
          `Arquivo Sincronizado no Google Drive: ${document_type} #${document_number}${clientText}`,
          `O documento "${title}"${photosText} foi organizado com sucesso no Google Drive${pathText}. Link da pasta: ${folder_url || 'N/A'}`,
          now
        ]
      );

      return res.json({
        success: true,
        drive_file_id: file_id || `gdrive_${Math.random().toString(36).substring(2, 12)}`,
        folder: folder_path || `CAST_Quote / ${document_type}`,
        folder_url: folder_url || null,
        photo_count: photo_count || 0,
        synced_at: now,
        message: 'Documento e fotos organizados no Google Drive com sucesso!'
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Get current central Drive settings
  app.get('/api/drive/settings', (req: Request, res: Response) => {
    try {
      const settings = queryOne<any>(`SELECT * FROM drive_settings ORDER BY updated_at DESC LIMIT 1`);
      return res.json(settings || null);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Save / update designated Drive settings
  app.post('/api/drive/settings', (req: Request, res: Response) => {
    try {
      const {
        account_email,
        account_name,
        account_photo,
        root_folder_name,
        auto_sync,
        sync_photos
      } = req.body;

      if (!account_email) {
        return res.status(400).json({ error: 'account_email é obrigatório' });
      }

      const now = new Date().toISOString();
      const existing = queryOne<any>(`SELECT id FROM drive_settings LIMIT 1`);

      if (existing) {
        runSql(
          `UPDATE drive_settings
           SET account_email = ?, account_name = ?, account_photo = ?,
               root_folder_name = ?, auto_sync = ?, sync_photos = ?, updated_at = ?
           WHERE id = ?`,
          [
            account_email,
            account_name || '',
            account_photo || '',
            root_folder_name || 'CAST_Quote',
            auto_sync ? 1 : 0,
            sync_photos ? 1 : 0,
            now,
            existing.id
          ]
        );
      } else {
        const id = `ds-${Date.now()}`;
        runSql(
          `INSERT INTO drive_settings (id, account_email, account_name, account_photo, root_folder_name, auto_sync, sync_photos, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            account_email,
            account_name || '',
            account_photo || '',
            root_folder_name || 'CAST_Quote',
            auto_sync !== false ? 1 : 0,
            sync_photos !== false ? 1 : 0,
            now,
            now
          ]
        );
      }

      return res.json({
        success: true,
        account_email,
        message: 'Configuração do Google Drive gravada com sucesso!'
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Disconnect designated Drive settings
  app.delete('/api/drive/settings', (req: Request, res: Response) => {
    try {
      runSql(`DELETE FROM drive_settings`);
      return res.json({ success: true, message: 'Conta do Google Drive desconectada.' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Health check
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', app: 'CAST Quote Backend', timestamp: new Date().toISOString() });
  });

  // ==========================================
  // VITE MIDDLEWARE SETUP
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CAST Quote server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
