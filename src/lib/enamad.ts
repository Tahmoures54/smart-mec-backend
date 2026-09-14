/** نماد اعتماد الکترونیکی — مجوز ثبت‌شده برای smart-mec.ir */
export const ENAMAD_SEAL_ID = '7731207';
export const ENAMAD_SEAL_CODE = 'Q14UpKWtFFDXzZarnOhA5dzChbURT0br';

export const ENAMAD_SEAL_HREF = `https://trustseal.enamad.ir/?id=${ENAMAD_SEAL_ID}&Code=${ENAMAD_SEAL_CODE}`;
export const ENAMAD_SEAL_IMG = `https://trustseal.enamad.ir/logo.aspx?id=${ENAMAD_SEAL_ID}&Code=${ENAMAD_SEAL_CODE}`;

/**
 * HTML رسمی اینماد (بدون تغییر در ویژگی‌ها).
 * referrerpolicy=origin لازم است تا اینماد مبدأ را بشناسد — rel=noreferrer نگذارید.
 */
export const ENAMAD_SEAL_HTML = `<a referrerpolicy='origin' target='_blank' href='${ENAMAD_SEAL_HREF}'><img referrerpolicy='origin' src='${ENAMAD_SEAL_IMG}' alt='' style='cursor:pointer' code='${ENAMAD_SEAL_CODE}'></a>`;
