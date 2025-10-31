-- Migration: Seed Full Product Catalogue with Install Times
-- This replaces the minimal 10-product seed with the complete Rainbow Design catalogue
-- Date: 2025-10-08

-- ==========================================
-- CLEAR EXISTING DEFAULT PRODUCTS (OPTIONAL)
-- ==========================================
-- Uncomment the line below if you want to start fresh
-- DELETE FROM product_catalogue WHERE source = 'default';

-- ==========================================
-- BASS TABLES - STANDARD
-- ==========================================
INSERT INTO product_catalogue (product_code, product_name, category, install_time_hours, waste_volume_m3, is_heavy, source, notes) VALUES
('BASS-L2000-W1200-H750', 'Bass Standard L2000×W1200×H750', 'tables', 1.6, 0.035, true, 'catalogue', 'Locked - Standard Bass table'),
('BASS-L2400-W1200-H750', 'Bass Standard L2400×W1200×H750', 'tables', 1.6, 0.035, true, 'catalogue', 'Locked - Standard Bass table'),
('BASS-L2400-W1500-H750', 'Bass Standard L2400×W1500×H750', 'tables', 1.6, 0.035, true, 'catalogue', 'Locked - Standard Bass table'),
('BASS-L2800-W1500-H750', 'Bass Standard L2800×W1500×H750', 'tables', 1.75, 0.035, true, 'catalogue', 'Locked - Standard Bass table'),

-- ==========================================
-- BASS+ TABLES
-- ==========================================
('BASS+-RECT-L5200-W1500-H750', 'Bass+ Rectangular L5200×W1500×H750', 'tables', 2.3, 0.035, true, 'catalogue', 'Locked - Bass+ Rectangular'),
('BASS+-RECT-L4000-W1500-H750', 'Bass+ Rectangular L4000×W1500×H750', 'tables', 2.0, 0.035, true, 'catalogue', 'Locked - Bass+ Rectangular'),
('BASS+-ROUND-D1200-H750', 'Bass+ Round D1200×H750', 'tables', 1.3, 0.035, true, 'catalogue', 'Locked - Bass+ Round'),
('BASS+-TRI-L2400-W2400-H750', 'Bass+ Triangular L2400×W2400×H750', 'tables', 1.6, 0.035, true, 'catalogue', 'Locked - Bass+ Triangular'),

-- ==========================================
-- BASS TAPERED / D-END (with logic rules)
-- ==========================================
('BASS-TAPERED-UNDER2000', 'Bass Tapered/D-End ≤2000mm base', 'tables', 0.25, 0.035, true, 'catalogue', 'LOGIC: Base Bass time + 0.25hr. Use matching standard Bass time as base.'),
('BASS-TAPERED-OVER2000', 'Bass Tapered/D-End >2000mm base', 'tables', 0.25, 0.035, true, 'catalogue', 'LOGIC: Base Bass time + 0.25hr + (0.2 × metres over 2000mm). Round to nearest 100mm for calculation.'),

-- ==========================================
-- ARNE TABLES
-- ==========================================
('ARNE-ROUND-ANY', 'Arne Round Table (any size)', 'tables', 1.3, 0.035, true, 'catalogue', 'Locked - Arne round table any size'),
('ARNE-L1800-W1200-H900', 'Arne Table L1800×W1200×H900', 'tables', 1.3, 0.035, true, 'catalogue', 'Locked - Arne table'),
('ARNE-L4000-W1200-H750', 'Arne Table L4000×W1200×H750', 'tables', 3.0, 0.035, true, 'catalogue', 'Locked - Arne table'),
('ARNE-L6600-W800-H750', 'Arne Table L6600×W800×H750', 'tables', 3.6, 0.035, true, 'catalogue', 'Locked - Arne table'),
('ARNE-COFFEE-L1200-W1200-H390', 'Arne Coffee Table L1200×W1200×H390', 'tables', 1.2, 0.035, false, 'catalogue', 'Locked - Arne coffee table'),

-- ==========================================
-- ROLLER TABLE
-- ==========================================
('ROLLER-L3200-W1200-H750', 'Roller Table L3200×W1200×H750', 'tables', 2.2, 0.035, true, 'catalogue', 'Locked - Roller table'),

-- ==========================================
-- FRANK TABLES & BENCH
-- ==========================================
('FRANK-TABLE-EQUIV', 'Frank Table (Workaround equiv)', 'tables', 0.35, 0.035, true, 'catalogue', 'LOGIC RULE: Workaround equiv time + 0.35hr. Applies to all sizes unless overridden.'),
('FRANK-L5200-W1000-H750', 'Frank Table L5200×W1000×H750', 'tables', 2.75, 0.035, true, 'catalogue', 'Locked override - Specific Frank table size'),
('FRANK-BENCH-ANY', 'Frank Bench (any size)', 'furniture', 1.0, 0.035, false, 'catalogue', 'Locked (project) - Frank bench any size'),

-- ==========================================
-- GLOW LIGHT BAR
-- ==========================================
('GLOW-L2400-W36-H460', 'Glow Light Bar L2400×W36×H460', 'accessories', 0.3, 0.020, false, 'catalogue', 'LOGIC: Frank-equiv time + 0.3hr. Locked.'),

-- ==========================================
-- WORKAROUND TABLES
-- ==========================================
('WORKAROUND-COWORK-6P', 'Workaround Co-Work 6P (any size)', 'tables', 1.7, 0.035, true, 'catalogue', 'Locked - Workaround 6-person co-work'),
('WORKAROUND-COWORK-8P', 'Workaround Co-Work 8P (any size)', 'tables', 2.0, 0.035, true, 'catalogue', 'Locked - Workaround 8-person co-work'),
('WORKAROUND-SQ-L1000-W1000-H750', 'Workaround Square L1000×W1000×H750', 'tables', 1.15, 0.035, true, 'catalogue', 'Locked - Workaround square table'),
('WORKAROUND-MTG-L1500-W800-H750', 'Workaround Meeting L1500×W800×H750', 'tables', 1.4, 0.035, true, 'catalogue', 'Locked - Workaround meeting table'),
('WORKAROUND-RECT-L2000-W1000-H750', 'Workaround Rectangular L2000×W1000×H750', 'tables', 1.3, 0.035, true, 'catalogue', 'Locked - Workaround rectangular'),
('WORKAROUND-CIRC-D1000-H750', 'Workaround Circular D1000×H750', 'tables', 0.7, 0.035, false, 'catalogue', 'Locked - Workaround circular small'),
('WORKAROUND-CIRC-D1800-H750', 'Workaround Circular D1800×H750', 'tables', 1.45, 0.035, true, 'catalogue', 'Locked - Workaround circular large'),
('WORKAROUND-CIRC-VARIABLE', 'Workaround Circular D1200/D1500/D2000/D2400', 'tables', 1.2, 0.035, true, 'catalogue', 'TBC - Provide dimensions to lock. Approximate time.'),

-- ==========================================
-- WOODY WORKAROUND (uses Workaround times)
-- ==========================================
('WOODY-WORKAROUND-ANY', 'Woody Workaround (all variants)', 'tables', 1.3, 0.035, true, 'catalogue', 'LOGIC RULE: Use matching Workaround times. Same size = same time.'),

-- ==========================================
-- FLX TABLES
-- ==========================================
('FLX-SINGLE-1P-L1200-1600', 'FLX Single 1P L1200-L1600×H750', 'tables', 0.6, 0.035, false, 'catalogue', 'Locked - FLX single person desk'),
('FLX-COWORK-4P-L2800-W1600', 'FLX Co-Work 4P L2800×W1600×H750', 'tables', 1.45, 0.035, true, 'catalogue', 'Locked (+0.05hr uplift baked in)'),
('FLX-COWORK-6P-L4200-W1600', 'FLX Co-Work 6P L4200×W1600×H750', 'tables', 1.9, 0.035, true, 'catalogue', 'Locked (+0.05hr uplift baked in)'),
('FLX-COWORK-8P-L5600-W1600', 'FLX Co-Work 8P L5600×W1600×H750', 'tables', 2.0, 0.035, true, 'catalogue', 'Locked - FLX 8-person co-work'),
('ESSENTIALS-FLX-ANY', 'Essentials FLX (all matching SKUs)', 'tables', 0.65, 0.035, false, 'catalogue', 'LOGIC RULE: Same as standard FLX + 0.05hr. Locked rule.'),

-- ==========================================
-- HI-LO SIT-STAND DESKS
-- ==========================================
('HI-LO-DUO-L1400-W1600', 'Hi-Lo Duo L1400×W1600×H620-1270', 'tables', 1.65, 0.035, true, 'catalogue', 'Locked - Hi-Lo height adjustable duo desk'),
('HI-LO-SINGLE-L1200-1600', 'Hi-Lo Single L1200-L1600×H620-1270', 'tables', 1.4, 0.035, true, 'catalogue', 'TBC - Confirm per new range. Approximate time.'),
('HI-LO-DIVIDERS-H400-605', 'Hi-Lo Desk Dividers H400/H605 (L1000-1600)', 'accessories', 0.3, 0.020, false, 'catalogue', 'TBC - Confirm per model. Approximate time.'),
('HI-LO-H-FRAME-DUO-1600', 'Hi-Lo H-Frame Duo 1600', 'tables', 1.65, 0.035, true, 'catalogue', 'TBC - Confirm per model. Using Duo time as baseline.'),

-- ==========================================
-- BILLY WORKSTATIONS
-- ==========================================
('BILLY-SINGLE-L1200-W1400-H1200', 'Billy Single L1200×W1400×H1200', 'workstations', 1.35, 0.035, true, 'catalogue', 'Locked (single only) - Billy workstation'),
('BILLY-SINGLE-L1400-W1400-H1200', 'Billy Single L1400×W1400×H1200', 'workstations', 1.35, 0.035, true, 'catalogue', 'TBC - Usually ≈ single baseline'),
('BILLY-BACK-TO-BACK-ANY', 'Billy Back-to-Back (any size)', 'workstations', 2.7, 0.035, true, 'catalogue', 'LOGIC: 2× single time. Time is per carcass set.'),

-- ==========================================
-- SEATING
-- ==========================================
('JUST-A-CHAIR-ANY', 'Just A Chair (any finish)', 'seating', 0.3, 0.020, false, 'catalogue', 'Locked - Just A Chair any finish'),
('CAGE-SOFA-L1800-2400', 'Cage Sofa L1800/L2200/L2400', 'seating', 0.7, 0.035, true, 'catalogue', 'Locked - Cage sofa range'),
('CAGE-BENCH-ANY', 'Cage Bench (any config)', 'seating', 0.8, 0.035, true, 'catalogue', 'Case-by-case - Timing by configuration'),
('CAGE-CUBE-ANY', 'Cage Cube (any config)', 'seating', 0.9, 0.035, true, 'catalogue', 'Case-by-case - Timing by configuration'),
('LOTUS-LOTTUS-CHAIR', 'Lotus/Lottus Chair (any)', 'seating', 0.01, 0.010, false, 'catalogue', 'Locked (project) - Verify if to retain. Minimal assembly.'),

-- ==========================================
-- STORAGE - PEDESTALS
-- ==========================================
('PEDESTAL-ANY', 'Pedestal (any type)', 'storage', 0.0, 0.020, false, 'catalogue', 'Locked - Include in quotes; use "Combi Lock" wording. 0.0hr install.'),

-- ==========================================
-- STORAGE - LOCKERS
-- ==========================================
('LOCKER-PER-CARCASS', 'Locker (any style) per carcass', 'storage', 0.5, 0.035, false, 'catalogue', 'Locked - 0.5hr per carcass. Cloaking panels included. Qty = total carcasses (width-only count).'),

-- ==========================================
-- STORAGE - PLANTERS
-- ==========================================
('PLANTER-SHELL-PLA-H-10-MFC', 'Planter Shell PLA-H-10-MFC', 'accessories', 0.0, 0.020, false, 'catalogue', 'Locked - Standalone planter shell only. 0.0hr install.'),
('PLANTER-SHELL-PLA-H-14-MFC', 'Planter Shell PLA-H-14-MFC', 'accessories', 0.0, 0.020, false, 'catalogue', 'Locked - Standalone planter shell only. 0.0hr install.'),
('DESK-END-PLANTER-CUP', 'Desk-End Planter CUP (1600 etc)', 'storage', 0.4, 0.035, false, 'catalogue', 'TBC - If planter-cupboard combo, use cupboard time.'),

-- ==========================================
-- STORAGE - CREDENZAS
-- ==========================================
('CREDENZA-L2200-D500-H750', 'Credenza Standard L2200×D500×H750', 'storage', 0.4, 0.035, true, 'catalogue', 'Locked - L2200 credenza'),
('CREDENZA-L1000-2400-RANGE', 'Credenza Standard L1000-L2400×D500×H750', 'storage', 0.4, 0.035, true, 'catalogue', 'TBC - Confirm per size. Using L2200 baseline.'),
('BRUNO-CREDENZA-3DR-L2000', 'Bruno Credenza 3-Door L2000×D500×H750', 'storage', 0.35, 0.035, true, 'catalogue', 'Locked (project) - Bruno credenza'),
('ENZA-CREDENZA-ANY', 'Enza Credenza (any size)', 'storage', 0.4, 0.035, true, 'catalogue', 'LOGIC RULE: Use Credenza time. Same size = same time.'),

-- ==========================================
-- POWER & ACCESSORIES
-- ==========================================
('POWER-COMPONENTS-UNIT', 'Power Components (bars/modules/trays)', 'accessories', 0.2, 0.010, false, 'catalogue', 'Locked - 0.2hr per unit. Group as one line in quotes. Includes Essentials trays.'),

-- ==========================================
-- COFFEE TABLES
-- ==========================================
('BASS-COFFEE-TABLE-ALL', 'Bass Coffee Tables (all sizes)', 'tables', 0.1, 0.020, false, 'catalogue', 'Locked - Bass coffee table any size'),

-- ==========================================
-- TBC PRODUCTS - AWAITING CONFIRMATION
-- ==========================================
('BRUNO-OTHER-TBC', 'Bruno (aside from credenza)', 'furniture', 0.5, 0.035, false, 'catalogue', 'TBC - Provide dimensions for more SKUs'),
('NAZ-RANGE-TBC', 'Naz Range (Cupboard/Locker/Double)', 'storage', 0.5, 0.035, false, 'catalogue', 'TBC - Provide model + dimensions to lock'),
('TOP-CAT-TBC', 'Top Cat (all variants)', 'furniture', 0.5, 0.035, false, 'catalogue', 'TBC - Provide dimensions to lock'),
('INDY-TABLES-BENCHES-TBC', 'Indy (all tables/benches)', 'tables', 0.8, 0.035, true, 'catalogue', 'TBC - Provide dimensions to lock'),
('CAFE-CLASSIC-BAR-OI-TBC', 'Café (Classic/Bar/Oi) 600-1200 widths', 'tables', 0.6, 0.035, false, 'catalogue', 'TBC - Provide exact models to lock. Heights: 750/1050'),
('SURF-ALL-TBC', 'Surf (all lengths)', 'furniture', 0.6, 0.035, false, 'catalogue', 'TBC - Provide exact size to lock'),
('BAD-BOY-ALL-TBC', 'Bad Boy (all lengths)', 'furniture', 0.6, 0.035, false, 'catalogue', 'TBC - Provide exact size to lock'),
('DUKE-ALL-TBC', 'Duke (all lengths)', 'furniture', 0.6, 0.035, false, 'catalogue', 'TBC - Provide exact size to lock'),
('LUDO-ALL-TBC', 'Ludo (all lengths/heights)', 'furniture', 0.6, 0.035, false, 'catalogue', 'TBC - Provide exact size to lock'),
('WORK-STORAGE-L1000-TBC', 'Work Storage L1000 (incl. planter)', 'storage', 0.5, 0.035, false, 'catalogue', 'TBC - Confirm style'),
('PIT-STOP-DOUBLE-TRIPLE-TBC', 'Pit Stop Double L1170 / Triple L1800', 'furniture', 0.7, 0.035, true, 'catalogue', 'TBC - Confirm sink/tap cutouts variant'),
('DESK-END-UNITS-TBC', 'Desk-End Units (Lockers/Cupboards L1400/1600)', 'storage', 0.5, 0.035, false, 'catalogue', 'TBC - Confirm type + size. Heights: H950/H1150'),
('WIRED-COFFEE-SIDE-TBC', 'Wired Coffee/Side Tables (Square/Rect/Round)', 'tables', 0.3, 0.020, false, 'catalogue', 'TBC - Assumed assembled; confirm per model'),
('BOUNCE-PING-PONG-TBC', 'Bounce Ping Pong Worktable L2740×W1525×H760', 'furniture', 1.2, 0.035, true, 'catalogue', 'TBC - Confirm if standard or special build')

ON CONFLICT (product_code) DO UPDATE SET
    product_name = EXCLUDED.product_name,
    install_time_hours = EXCLUDED.install_time_hours,
    waste_volume_m3 = EXCLUDED.waste_volume_m3,
    is_heavy = EXCLUDED.is_heavy,
    notes = EXCLUDED.notes,
    updated_at = NOW();

-- ==========================================
-- ADD PRODUCT ALIASES FOR FUZZY MATCHING
-- ==========================================
INSERT INTO product_aliases (alias_code, master_product_code) VALUES
-- Bass variants
('BASS', 'BASS-L2400-W1200-H750'),
('BASS STANDARD', 'BASS-L2400-W1200-H750'),
('BASS+', 'BASS+-RECT-L4000-W1500-H750'),
('BASS PLUS', 'BASS+-RECT-L4000-W1500-H750'),
('BASS TAPERED', 'BASS-TAPERED-UNDER2000'),
('BASS D-END', 'BASS-TAPERED-UNDER2000'),

-- Arne variants
('ARNE', 'ARNE-L1800-W1200-H900'),
('ARNE TABLE', 'ARNE-L1800-W1200-H900'),
('ARNE COFFEE', 'ARNE-COFFEE-L1200-W1200-H390'),

-- Workaround variants
('WORKAROUND', 'WORKAROUND-RECT-L2000-W1000-H750'),
('WORKAROUND 6P', 'WORKAROUND-COWORK-6P'),
('WORKAROUND 8P', 'WORKAROUND-COWORK-8P'),
('WORKAROUND MEETING', 'WORKAROUND-MTG-L1500-W800-H750'),
('WORKAROUND SQUARE', 'WORKAROUND-SQ-L1000-W1000-H750'),
('WORKAROUND CIRCULAR', 'WORKAROUND-CIRC-D1000-H750'),
('WOODY', 'WOODY-WORKAROUND-ANY'),

-- FLX variants
('FLX', 'FLX-SINGLE-1P-L1200-1600'),
('FLX SINGLE', 'FLX-SINGLE-1P-L1200-1600'),
('FLX 4P', 'FLX-COWORK-4P-L2800-W1600'),
('FLX 6P', 'FLX-COWORK-6P-L4200-W1600'),
('FLX 8P', 'FLX-COWORK-8P-L5600-W1600'),
('ESSENTIALS FLX', 'ESSENTIALS-FLX-ANY'),

-- Hi-Lo variants
('HI-LO', 'HI-LO-SINGLE-L1200-1600'),
('HILO', 'HI-LO-SINGLE-L1200-1600'),
('HI-LO DUO', 'HI-LO-DUO-L1400-W1600'),
('SIT STAND', 'HI-LO-SINGLE-L1200-1600'),

-- Frank variants
('FRANK', 'FRANK-TABLE-EQUIV'),
('FRANK TABLE', 'FRANK-TABLE-EQUIV'),
('FRANK BENCH', 'FRANK-BENCH-ANY'),

-- Billy variants
('BILLY', 'BILLY-SINGLE-L1200-W1400-H1200'),
('BILLY SINGLE', 'BILLY-SINGLE-L1200-W1400-H1200'),
('BILLY B2B', 'BILLY-BACK-TO-BACK-ANY'),
('BILLY BACK TO BACK', 'BILLY-BACK-TO-BACK-ANY'),

-- Seating
('CHAIR', 'JUST-A-CHAIR-ANY'),
('JUST A CHAIR', 'JUST-A-CHAIR-ANY'),
('CAGE SOFA', 'CAGE-SOFA-L1800-2400'),
('CAGE BENCH', 'CAGE-BENCH-ANY'),
('CAGE CUBE', 'CAGE-CUBE-ANY'),
('LOTUS', 'LOTUS-LOTTUS-CHAIR'),
('LOTTUS', 'LOTUS-LOTTUS-CHAIR'),

-- Storage
('PEDESTAL', 'PEDESTAL-ANY'),
('PED', 'PEDESTAL-ANY'),
('LOCKER', 'LOCKER-PER-CARCASS'),
('CREDENZA', 'CREDENZA-L2200-D500-H750'),
('BRUNO CREDENZA', 'BRUNO-CREDENZA-3DR-L2000'),
('ENZA', 'ENZA-CREDENZA-ANY'),
('ENZA CREDENZA', 'ENZA-CREDENZA-ANY'),

-- Accessories
('POWER', 'POWER-COMPONENTS-UNIT'),
('POWER BAR', 'POWER-COMPONENTS-UNIT'),
('POWER MODULE', 'POWER-COMPONENTS-UNIT'),
('PLANTER', 'PLANTER-SHELL-PLA-H-10-MFC'),
('GLOW', 'GLOW-L2400-W36-H460'),

-- Coffee tables
('BASS COFFEE', 'BASS-COFFEE-TABLE-ALL'),
('ROLLER', 'ROLLER-L3200-W1200-H750')

ON CONFLICT (alias_code) DO NOTHING;

-- ==========================================
-- STANDING RULES & LOGIC DOCUMENTATION
-- ==========================================

COMMENT ON TABLE product_catalogue IS
'Full Rainbow Design product catalogue with install times.

STANDING RULES (baked into times or documented in notes):

1. WOODY WORKAROUND: Uses matching Workaround times (same size = same time)
2. ENZA CREDENZA: Uses matching Credenza times (same size = same time)
3. LOCKERS: Qty = total carcasses (width only); 0.5hr per carcass; cloaking panels included
4. POWER COMPONENTS: Always group into single total line in quoting; 0.2hr per unit
5. PEDESTALS: Always included in quotes; 0.0hr install; use "Combi Lock" wording
6. TAPERED BASS: Base Bass time + 0.25hr + 0.2hr per metre over 2000mm (round to nearest 100mm)
7. FRANK TABLE RULE: Workaround equiv + 0.35hr applies to all sizes unless specific override
8. ESSENTIALS FLX: Standard FLX time + 0.05hr (locked rule)
9. BILLY BACK-TO-BACK: 2× single time (time is per carcass set)
10. CAGE CUBE/BENCH: Case-by-case timing based on site/design requirements

LEARNING PROTOCOL:
- Products marked "TBC" should be confirmed with actual dimensions when quoted
- New products learned through quoting process should be added with source="learned"
- All times should be reviewed after first install and locked when validated
- Logic rules should be preserved in notes field for reference
';
