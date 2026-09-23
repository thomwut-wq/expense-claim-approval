// Seeds auth users, profiles and ~25 sample claims. Requires SUPABASE_DB_URL.
// Passwords come from env (ADMIN_PASSWORD / STAFF_PASSWORD) and are never written to the repo.
import { makeClient } from "./db.mjs";

const DOMAIN = process.env.LOGIN_EMAIL_DOMAIN || "expenseclaim.dev";
const USERS = [
  { username: "admin", full_name: "วรรณา ศรีสุข", role: "admin", password: process.env.ADMIN_PASSWORD },
  { username: "somchai", full_name: "สมชาย ใจดี", role: "staff", password: process.env.STAFF_PASSWORD },
  { username: "nattaya", full_name: "ณัฐญา พงศ์พิพัฒน์", role: "staff", password: process.env.STAFF_PASSWORD },
];

for (const u of USERS) if (!u.password) throw new Error(`Missing password for ${u.username}`);

const c = makeClient();
await c.connect();

const ids = {};
for (const u of USERS) {
  const email = `${u.username}@${DOMAIN}`;
  const existing = await c.query("select id from auth.users where email = $1", [email]);
  let id;
  if (existing.rows.length) {
    id = existing.rows[0].id;
    await c.query(
      `update auth.users set encrypted_password = crypt($2, gen_salt('bf')), email_confirmed_at = coalesce(email_confirmed_at, now()), updated_at = now() where id = $1`,
      [id, u.password],
    );
  } else {
    const r = await c.query(
      `insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
         raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token,
         email_change_token_new, email_change, is_super_admin)
       values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', $1,
         crypt($2, gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb,
         jsonb_build_object('full_name', $3::text, 'username', $4::text), now(), now(), '', '', '', '', false)
       returning id`,
      [email, u.password, u.full_name, u.username],
    );
    id = r.rows[0].id;
  }
  await c.query(
    `insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
     select gen_random_uuid(), $1::uuid, $1::text, 'email', jsonb_build_object('sub', $1::text, 'email', $2::text, 'email_verified', true), now(), now(), now()
     where not exists (select 1 from auth.identities where user_id = $1::uuid and provider = 'email')`,
    [id, email],
  );
  await c.query(
    `insert into public.expense_claim_approval_hzta_profiles (id, full_name, role) values ($1, $2, $3)
     on conflict (id) do update set full_name = excluded.full_name, role = excluded.role`,
    [id, u.full_name, u.role],
  );
  ids[u.username] = id;
  console.log(`user ${u.username} -> ${id}`);
}

const { rows: cnt } = await c.query("select count(*)::int as n from public.expense_claim_approval_hzta_claims");
if (cnt[0].n > 0) {
  console.log(`claims already seeded (${cnt[0].n}) — skipping claim seed`);
  await c.end();
  process.exit(0);
}

// Dates relative to the current month (Asia/Bangkok)
const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
const ym = (offset, day) => {
  const d = new Date(now.getFullYear(), now.getMonth() + offset, day);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const S = ids.somchai, N = ids.nattaya, A = ids.admin;
// [monthOffset, day, owner, title, category, amount, description, status, receipt, reject_reason]
const claims = [
  [-3, 3, S, "ค่าแท็กซี่ไปประชุมลูกค้า สาทร", "travel", 320, "แท็กซี่จากสำนักงานไปอาคารเอ็มไพร์ ทาวเวอร์ และกลับ", "PAID", "RC-2306-0142"],
  [-3, 7, N, "ค่าอาหารรับรองลูกค้า บจก. สยามเทรด", "entertainment", 4850, "รับรองอาหารกลางวัน 4 ท่าน ร้านสมบูรณ์โภชนา", "PAID", "RC-2306-0155"],
  [-3, 12, S, "กระดาษ A4 และหมึกพิมพ์", "office", 2790, "กระดาษ Double A 5 รีม และหมึก Canon 2 ตลับ จาก OfficeMate", "PAID", "RC-2306-0161"],
  [-3, 18, N, "ค่าโทรศัพท์มือถือ ประจำเดือน", "phone", 899, "แพ็กเกจ AIS รายเดือน สำหรับติดต่อลูกค้า", "PAID", "RC-2306-0170"],
  [-3, 22, S, "ค่าน้ำมันเดินทางไปสาขาชลบุรี", "travel", 1850, "เติมน้ำมัน ปตท. บางนา ไป-กลับสาขาชลบุรี", "REJECTED", null, "ไม่มีใบเสร็จรับเงินฉบับจริงแนบมาด้วย"],
  [-3, 27, N, "ค่ารถไฟฟ้า BTS ตลอดเดือน", "travel", 1240, "เติมบัตร Rabbit สำหรับเดินทางพบลูกค้า", "PAID", "RC-2306-0188"],
  [-2, 2, S, "ค่าเช่ารถตู้ไปสัมมนาเขาใหญ่", "travel", 6500, "รถตู้ 2 วัน พร้อมคนขับ สำหรับทีมขาย 8 คน", "PAID", "RC-2307-0201"],
  [-2, 6, N, "ค่ากาแฟรับรองผู้สมัครงาน", "entertainment", 560, "กาแฟและของว่างที่ Starbucks สัมภาษณ์ 3 ท่าน", "PAID", "RC-2307-0209"],
  [-2, 9, S, "อุปกรณ์สำนักงาน แฟ้มและปากกา", "office", 1320, "แฟ้มสันกว้าง 20 แฟ้ม ปากกา 2 กล่อง จาก B2S", "PAID", "RC-2307-0214"],
  [-2, 14, N, "ค่าอาหารเย็นรับรองคู่ค้าญี่ปุ่น", "entertainment", 12500, "ร้านอาหารญี่ปุ่น Sushi Masato 6 ท่าน", "APPROVED", null],
  [-2, 17, S, "ค่าโทรศัพท์มือถือ ประจำเดือน", "phone", 799, "แพ็กเกจ True รายเดือน", "PAID", "RC-2307-0228"],
  [-2, 21, N, "ค่าที่พักดูงาน จ.เชียงใหม่", "travel", 4200, "โรงแรม 2 คืน ดูงานโรงงานคู่ค้า", "REJECTED", null, "เกินงบที่พักต่อคืนที่บริษัทกำหนด (1,500 บาท) กรุณาแก้ไข"],
  [-2, 25, S, "ค่าส่งเอกสารด่วน Kerry", "other", 180, "ส่งสัญญาต้นฉบับให้ลูกค้าที่ระยอง", "PAID", "RC-2307-0240"],
  [-1, 1, N, "ค่าเครื่องบินไปประชุมภูเก็ต", "travel", 5890, "ตั๋ว Bangkok Airways ไป-กลับ ภูเก็ต", "PAID", "RC-2308-0301"],
  [-1, 5, S, "ค่ารับรองอาหารกลางวัน ลูกค้าธนาคาร", "entertainment", 3200, "ร้าน Greyhound Cafe 4 ท่าน", "APPROVED", null],
  [-1, 8, N, "ค่าซ่อมเครื่องพิมพ์สำนักงาน", "office", 2150, "เปลี่ยนลูกกลิ้งเครื่องพิมพ์ HP ชั้น 3", "PAID", "RC-2308-0310"],
  [-1, 12, S, "ค่าโทรศัพท์มือถือ ประจำเดือน", "phone", 799, "แพ็กเกจ True รายเดือน", "APPROVED", null],
  [-1, 16, N, "ค่าแกร็บไปสำนักงานที่ดิน", "travel", 260, "Grab ไปสำนักงานที่ดินกรุงเทพฯ สาขาบางเขน", "PAID", "RC-2308-0322"],
  [-1, 20, S, "ค่าน้ำดื่มและกาแฟสำนักงาน", "office", 1480, "น้ำดื่ม 10 แพ็ก และกาแฟสำเร็จรูป จาก Makro", "SUBMITTED", null],
  [-1, 26, N, "ค่าจอดรถอาคารลูกค้า", "other", 150, "ค่าจอดรถ 3 ชั่วโมง อาคารสาธรสแควร์", "REJECTED", null, "รายการนี้ยื่นซ้ำกับ EXP ก่อนหน้า"],
  [0, 2, S, "ค่าแท็กซี่ไปกรมสรรพากร", "travel", 280, "แท็กซี่ไป-กลับ กรมสรรพากร พหลโยธิน", "SUBMITTED", null],
  [0, 5, N, "ค่ารับรองลูกค้า บจก. ไทยรุ่งเรือง", "entertainment", 6750, "อาหารเย็น 5 ท่าน ร้านบ้านสวนไผ่", "SUBMITTED", null],
  [0, 8, S, "หมึกพิมพ์และกระดาษสติกเกอร์", "office", 1990, "หมึก Brother 1 ชุด และกระดาษสติกเกอร์ 3 แพ็ก", "APPROVED", null],
  [0, 10, N, "ค่าโทรศัพท์มือถือ ประจำเดือน", "phone", 899, "แพ็กเกจ AIS รายเดือน", "SUBMITTED", null],
  [0, 12, S, "ค่ารถทัวร์ไปตรวจงานสาขาขอนแก่น", "travel", 1580, "นครชัยแอร์ ไป-กลับ ขอนแก่น", "DRAFT", null],
  [0, 15, N, "ค่าอาหารว่างประชุมทีมประจำเดือน", "entertainment", 1250, "ขนมและเครื่องดื่มสำหรับประชุม 15 คน", "DRAFT", null],
  [0, 18, A, "ค่าลงทะเบียนสัมมนาบัญชี", "other", 3500, "สัมมนามาตรฐานบัญชี TFRS สภาวิชาชีพบัญชี", "PAID", "RC-2309-0412"],
];

for (const [mo, day, owner, title, category, amount, description, status, receipt, reason] of claims) {
  const date = ym(mo, day);
  const submitted = status === "DRAFT" ? null : `${date}T09:30:00+07:00`;
  const approved = ["APPROVED", "PAID", "REJECTED"].includes(status) ? `${date}T15:00:00+07:00` : null;
  const paid = status === "PAID" ? `${date}T17:00:00+07:00` : null;
  await c.query(
    `insert into public.expense_claim_approval_hzta_claims
      (title, category, amount, expense_date, description, receipt_no, status, reject_reason, created_by, approved_by, submitted_at, approved_at, paid_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [title, category, amount, date, description, receipt ?? null, status, reason ?? null, owner, approved ? A : null, submitted, approved, paid],
  );
}
console.log(`seeded ${claims.length} claims`);
await c.end();
