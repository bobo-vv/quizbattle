/* ============================================================
   ZapQuiz – i18n (Thai / English)
   ============================================================ */
const translations = {
  th: {
    /* Landing */
    'landing.subtitle': 'สนุกกับการเรียนรู้แบบ Real-time!',
    'landing.joinGame': 'เข้าร่วมเกม',
    'landing.hostLogin': 'เข้าสู่ระบบ (Host)',
    'landing.footer': 'ZapQuiz \u00a9 2026 - Powered by Learning & Fun',

    /* Auth */
    'auth.hostAccess': 'เข้าสู่ระบบสำหรับ Host',
    'auth.loginTab': 'เข้าสู่ระบบ',
    'auth.registerTab': 'สมัครสมาชิก',
    'auth.username': 'ชื่อผู้ใช้',
    'auth.password': 'รหัสผ่าน',
    'auth.confirmPassword': 'ยืนยันรหัสผ่าน',
    'auth.loginBtn': 'เข้าสู่ระบบ',
    'auth.registerBtn': 'สมัครสมาชิก',
    'auth.email': 'อีเมล',
    'auth.emailPlaceholder': 'email@example.com',
    'auth.pendingApproval': 'บัญชีของคุณกำลังรอ Admin อนุมัติ',
    'auth.rejectedAccount': 'บัญชีของคุณถูกปฏิเสธ',
    'auth.acceptTerms': 'ยอมรับเงื่อนไขการใช้งาน',
    'auth.mustAcceptTerms': 'กรุณายอมรับเงื่อนไขการใช้งาน',
    'auth.registerSuccess': 'สมัครสมาชิกสำเร็จ! กรุณารอ Admin อนุมัติ',
    'auth.allFieldsRequired': 'กรุณากรอกข้อมูลให้ครบ',
    'auth.passwordMismatch': 'รหัสผ่านไม่ตรงกัน',

    /* Dashboard */
    'dashboard.title': 'แดชบอร์ด',
    'dashboard.createQuiz': '+ สร้าง Quiz ใหม่',
    'dashboard.greeting': 'สวัสดี, Host',
    'dashboard.logout': 'ออกจากระบบ',
    'dashboard.emptyTitle': 'ยังไม่มี Quiz',
    'dashboard.emptyMsg': 'เริ่มสร้าง Quiz แรกของคุณเลย!',
    'dashboard.createFirst': 'สร้าง Quiz แรก',
    'dashboard.questions': ' คำถาม',
    'dashboard.edit': 'แก้ไข',
    'dashboard.play': 'เล่น',
    'dashboard.duplicate': 'ทำซ้ำ',
    'dashboard.delete': 'ลบ',

    /* Create / Edit Quiz */
    'create.quizTitlePlaceholder': 'ชื่อ Quiz ของคุณ',
    'create.description': 'รายละเอียด',
    'create.descPlaceholder': 'อธิบาย Quiz ของคุณ...',
    'create.save': 'บันทึก',
    'create.questionList': 'รายการคำถาม',
    'create.addQuestion': '+ เพิ่มคำถาม',
    'create.selectOrAdd': 'เลือกคำถามจากรายการ หรือเพิ่มคำถามใหม่',
    'create.questionType': 'ประเภทคำถาม',
    'create.multipleChoice': 'ตัวเลือก',
    'create.trueFalse': 'ถูก/ผิด',
    'create.questionText': 'คำถาม',
    'create.questionPlaceholder': 'พิมพ์คำถามที่นี่...',
    'create.imageUrl': 'URL รูปภาพ (ไม่บังคับ)',
    'create.imagePlaceholder': 'https://example.com/image.jpg',
    'create.timeLimit': 'เวลา (วินาที)',
    'create.points': 'คะแนน',
    'create.answers': 'คำตอบ',
    'create.correct': 'ถูก',
    'create.answer1': 'คำตอบที่ 1',
    'create.answer2': 'คำตอบที่ 2',
    'create.answer3': 'คำตอบที่ 3',
    'create.answer4': 'คำตอบที่ 4',
    'create.true': 'ถูก (True)',
    'create.false': 'ผิด (False)',
    'create.deleteQuestion': 'ลบคำถามนี้',
    'create.importExcel': 'Import จาก Excel',
    'create.downloadTemplate': 'Download Template',
    'create.importPreview': 'ตัวอย่างคำถามที่จะ Import',
    'create.importFound': 'พบ {0} คำถาม',
    'create.importAll': 'Import ทั้งหมด',
    'create.importCancel': 'ยกเลิก',
    'create.importSuccess': 'Import สำเร็จ {0} คำถาม',
    'create.importError': 'ไม่สามารถอ่านไฟล์ได้',

    /* Host */
    'host.gamePin': 'Game PIN:',
    'host.playersJoined': 'ผู้เล่นที่เข้าร่วม',
    'host.players': 'ผู้เล่น',
    'host.startGame': 'เริ่มเกม',
    'host.answered': 'ตอบแล้ว',
    'host.correct': 'ถูก',
    'host.wrong': 'ผิด',
    'host.next': 'ถัดไป',
    'host.leaderboard': 'อันดับคะแนน',
    'host.halftime': 'ครึ่งทางแล้ว!',
    'host.continueGame': 'ไปต่อเลย!',
    'host.finalResults': 'ผลการแข่งขัน',
    'host.backDashboard': 'กลับแดชบอร์ด',

    /* Join */
    'join.pinLabel': 'Game PIN',
    'join.pinPlaceholder': '000000',
    'join.nicknameLabel': 'ชื่อเล่น',
    'join.nicknamePlaceholder': 'ใส่ชื่อเล่นของคุณ',
    'join.chooseAvatar': 'เลือกตัวละคร',
    'join.joinBtn': 'เข้าร่วม!',

    /* Play */
    'play.waiting': 'กำลังรอ Host เริ่มเกม...',
    'play.submitted': 'ส่งคำตอบแล้ว!',
    'play.waitForResults': 'รอดูผลลัพธ์...',
    'play.pointsEarned': 'คะแนนที่ได้',
    'play.totalScore': 'คะแนนรวม',
    'play.streak': 'ตอบถูกติดต่อกัน',
    'play.halftime': 'ครึ่งทางแล้ว!',
    'play.yourRankNow': 'อันดับตอนนี้',
    'play.halftimeMsg': 'สู้ต่อไป! ยังเหลืออีกครึ่ง!',
    'play.yourRank': 'อันดับของคุณ',
    'play.rank': 'อันดับ',
    'play.gameOver': 'จบเกม!',
    'play.finalRank': 'อันดับสุดท้าย',
    'play.finalScore': 'คะแนนรวม',
    'play.congratsTop3': 'ยินดีด้วย! คุณติด Top 3!',
    'play.playAgain': 'เล่นอีกครั้ง',
    'play.true': 'ถูก (True)',
    'play.false': 'ผิด (False)',
    'play.correct': 'ถูกต้อง!',
    'play.wrong': 'ผิด!',

    /* Settings */
    'settings.title': 'ตั้งค่าบัญชี',
    'settings.profileInfo': 'ข้อมูลโปรไฟล์',
    'settings.currentRole': 'Role',
    'settings.memberSince': 'สมาชิกตั้งแต่',
    'settings.changeEmail': 'เปลี่ยนอีเมล',
    'settings.newEmail': 'อีเมลใหม่',
    'settings.saveEmail': 'บันทึกอีเมล',
    'settings.emailSaved': 'บันทึกอีเมลสำเร็จ!',
    'settings.changePassword': 'เปลี่ยนรหัสผ่าน',
    'settings.oldPassword': 'รหัสผ่านเดิม',
    'settings.newPassword': 'รหัสผ่านใหม่',
    'settings.confirmNewPassword': 'ยืนยันรหัสผ่านใหม่',
    'settings.savePassword': 'เปลี่ยนรหัสผ่าน',
    'settings.passwordSaved': 'เปลี่ยนรหัสผ่านสำเร็จ!',
    'settings.passwordTooShort': 'รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร',
    'settings.allFieldsRequired': 'กรุณากรอกข้อมูลให้ครบ',
    'settings.dangerZone': 'Danger Zone',
    'settings.deleteWarning': 'การลบบัญชีจะลบ Quiz ทั้งหมดของคุณด้วย ไม่สามารถกู้คืนได้',
    'settings.deleteAccount': 'ลบบัญชี',
    'settings.confirmDeleteTitle': 'ยืนยันลบบัญชี',
    'settings.confirmDeleteMsg': 'กรุณาใส่รหัสผ่านเพื่อยืนยัน',
    'settings.confirmDelete': 'ลบบัญชีถาวร',
    'settings.adminCantDelete': 'Admin ไม่สามารถลบบัญชีตัวเองได้',

    /* Admin */
    'admin.title': 'จัดการสมาชิก',
    'admin.manageUsers': 'จัดการสมาชิก',
    'admin.totalUsers': 'สมาชิกทั้งหมด',
    'admin.pendingCount': 'รออนุมัติ',
    'admin.totalQuizzes': 'Quiz ทั้งหมด',
    'admin.premiumCount': 'Premium',
    'admin.pendingTab': 'รออนุมัติ',
    'admin.allUsersTab': 'สมาชิกทั้งหมด',
    'admin.searchPlaceholder': 'ค้นหา username หรือ email...',
    'admin.colUsername': 'Username',
    'admin.colEmail': 'Email',
    'admin.colRole': 'Role',
    'admin.colStatus': 'Status',
    'admin.colQuizzes': 'Quiz',
    'admin.colLastLogin': 'Last Login',
    'admin.colActions': 'Actions',
    'admin.approve': 'อนุมัติ',
    'admin.reject': 'ปฏิเสธ',
    'admin.resetPassword': 'Reset PW',
    'admin.confirmApprove': 'อนุมัติผู้ใช้นี้?',
    'admin.confirmReject': 'ปฏิเสธผู้ใช้นี้?',
    'admin.confirmReset': 'รีเซ็ตรหัสผ่านผู้ใช้นี้?',
    'admin.newPasswordTitle': 'รหัสผ่านใหม่',
    'admin.copyPasswordNote': 'กรุณาคัดลอกรหัสผ่านนี้ให้ผู้ใช้ จะไม่แสดงอีก',
    'admin.close': 'ปิด',
    'admin.noUsers': 'ไม่มีข้อมูล',

    /* Limits */
    'limits.quizLimitReached': 'คุณสร้าง Quiz ครบจำนวนแล้ว อัปเกรดเป็น Premium เพื่อสร้างเพิ่ม',
    'limits.playerLimitReached': 'จำนวนผู้เล่นเต็มแล้ว',
    'limits.upgradeMessage': 'อัปเกรดเป็น Premium เพื่อปลดล็อกฟีเจอร์เพิ่มเติม',

    /* Welcome */
    'welcome.approvedMessage': 'ยินดีต้อนรับ! บัญชีของคุณได้รับการอนุมัติแล้ว',

    /* Common */
    'common.backHome': '\u2190 กลับหน้าหลัก',
    'common.back': '\u2190 กลับ',

    'lang.toggle': 'EN'
  },

  en: {
    /* Landing */
    'landing.subtitle': 'Learn and have fun in Real-time!',
    'landing.joinGame': 'Join Game',
    'landing.hostLogin': 'Sign In (Host)',
    'landing.footer': 'ZapQuiz \u00a9 2026 - Powered by Learning & Fun',

    /* Auth */
    'auth.hostAccess': 'Sign in as Host',
    'auth.loginTab': 'Login',
    'auth.registerTab': 'Register',
    'auth.username': 'Username',
    'auth.password': 'Password',
    'auth.confirmPassword': 'Confirm Password',
    'auth.loginBtn': 'Sign In',
    'auth.registerBtn': 'Register',
    'auth.email': 'Email',
    'auth.emailPlaceholder': 'email@example.com',
    'auth.pendingApproval': 'Your account is pending admin approval',
    'auth.rejectedAccount': 'Your account has been rejected',
    'auth.acceptTerms': 'Accept terms of service',
    'auth.mustAcceptTerms': 'You must accept the terms',
    'auth.registerSuccess': 'Registration successful! Please wait for admin approval.',
    'auth.allFieldsRequired': 'All fields are required',
    'auth.passwordMismatch': 'Passwords do not match',

    /* Dashboard */
    'dashboard.title': 'Dashboard',
    'dashboard.createQuiz': '+ Create New Quiz',
    'dashboard.greeting': 'Hello, Host',
    'dashboard.logout': 'Logout',
    'dashboard.emptyTitle': 'No Quizzes Yet',
    'dashboard.emptyMsg': 'Create your first quiz to get started!',
    'dashboard.createFirst': 'Create First Quiz',
    'dashboard.questions': ' questions',
    'dashboard.edit': 'Edit',
    'dashboard.play': 'Play',
    'dashboard.duplicate': 'Duplicate',
    'dashboard.delete': 'Delete',

    /* Create / Edit Quiz */
    'create.quizTitlePlaceholder': 'Your Quiz Title',
    'create.description': 'Description',
    'create.descPlaceholder': 'Describe your quiz...',
    'create.save': 'Save',
    'create.questionList': 'Question List',
    'create.addQuestion': '+ Add Question',
    'create.selectOrAdd': 'Select a question or add a new one',
    'create.questionType': 'Question Type',
    'create.multipleChoice': 'Multiple Choice',
    'create.trueFalse': 'True / False',
    'create.questionText': 'Question',
    'create.questionPlaceholder': 'Type your question here...',
    'create.imageUrl': 'Image URL (optional)',
    'create.imagePlaceholder': 'https://example.com/image.jpg',
    'create.timeLimit': 'Time (seconds)',
    'create.points': 'Points',
    'create.answers': 'Answers',
    'create.correct': 'Correct',
    'create.answer1': 'Answer 1',
    'create.answer2': 'Answer 2',
    'create.answer3': 'Answer 3',
    'create.answer4': 'Answer 4',
    'create.true': 'True',
    'create.false': 'False',
    'create.deleteQuestion': 'Delete this question',
    'create.importExcel': 'Import from Excel',
    'create.downloadTemplate': 'Download Template',
    'create.importPreview': 'Questions to Import',
    'create.importFound': 'Found {0} questions',
    'create.importAll': 'Import All',
    'create.importCancel': 'Cancel',
    'create.importSuccess': 'Successfully imported {0} questions',
    'create.importError': 'Could not read file',

    /* Host */
    'host.gamePin': 'Game PIN:',
    'host.playersJoined': 'Players Joined',
    'host.players': 'players',
    'host.startGame': 'Start Game',
    'host.answered': 'answered',
    'host.correct': 'Correct',
    'host.wrong': 'Wrong',
    'host.next': 'Next',
    'host.leaderboard': 'Leaderboard',
    'host.halftime': 'HALF-TIME!',
    'host.continueGame': 'Continue!',
    'host.finalResults': 'Final Results',
    'host.backDashboard': 'Back to Dashboard',

    /* Join */
    'join.pinLabel': 'Game PIN',
    'join.pinPlaceholder': '000000',
    'join.nicknameLabel': 'Nickname',
    'join.nicknamePlaceholder': 'Enter your nickname',
    'join.chooseAvatar': 'Choose your avatar',
    'join.joinBtn': 'Join!',

    /* Play */
    'play.waiting': 'Waiting for host to start...',
    'play.submitted': 'Answer submitted!',
    'play.waitForResults': 'Waiting for results...',
    'play.pointsEarned': 'Points Earned',
    'play.totalScore': 'Total Score',
    'play.streak': 'Answer Streak',
    'play.halftime': 'HALF-TIME!',
    'play.yourRankNow': 'Your Rank Now',
    'play.halftimeMsg': 'Keep going! Half-way there!',
    'play.yourRank': 'Your Rank',
    'play.rank': 'Rank',
    'play.gameOver': 'Game Over!',
    'play.finalRank': 'Final Rank',
    'play.finalScore': 'Total Score',
    'play.congratsTop3': 'Congratulations! You made Top 3!',
    'play.playAgain': 'Play Again',
    'play.true': 'True',
    'play.false': 'False',
    'play.correct': 'Correct!',
    'play.wrong': 'Wrong!',

    /* Settings */
    'settings.title': 'Account Settings',
    'settings.profileInfo': 'Profile Info',
    'settings.currentRole': 'Role',
    'settings.memberSince': 'Member Since',
    'settings.changeEmail': 'Change Email',
    'settings.newEmail': 'New Email',
    'settings.saveEmail': 'Save Email',
    'settings.emailSaved': 'Email updated!',
    'settings.changePassword': 'Change Password',
    'settings.oldPassword': 'Current Password',
    'settings.newPassword': 'New Password',
    'settings.confirmNewPassword': 'Confirm New Password',
    'settings.savePassword': 'Change Password',
    'settings.passwordSaved': 'Password changed!',
    'settings.passwordTooShort': 'Min 4 characters',
    'settings.allFieldsRequired': 'All fields required',
    'settings.dangerZone': 'Danger Zone',
    'settings.deleteWarning': 'Deleting your account will also delete all your quizzes. This cannot be undone.',
    'settings.deleteAccount': 'Delete Account',
    'settings.confirmDeleteTitle': 'Confirm Delete Account',
    'settings.confirmDeleteMsg': 'Enter your password to confirm',
    'settings.confirmDelete': 'Delete Account Permanently',
    'settings.adminCantDelete': 'Admin cannot delete own account',

    /* Admin */
    'admin.title': 'Manage Users',
    'admin.manageUsers': 'Manage Users',
    'admin.totalUsers': 'Total Users',
    'admin.pendingCount': 'Pending',
    'admin.totalQuizzes': 'Total Quizzes',
    'admin.premiumCount': 'Premium',
    'admin.pendingTab': 'Pending',
    'admin.allUsersTab': 'All Users',
    'admin.searchPlaceholder': 'Search username or email...',
    'admin.colUsername': 'Username',
    'admin.colEmail': 'Email',
    'admin.colRole': 'Role',
    'admin.colStatus': 'Status',
    'admin.colQuizzes': 'Quizzes',
    'admin.colLastLogin': 'Last Login',
    'admin.colActions': 'Actions',
    'admin.approve': 'Approve',
    'admin.reject': 'Reject',
    'admin.resetPassword': 'Reset PW',
    'admin.confirmApprove': 'Approve this user?',
    'admin.confirmReject': 'Reject this user?',
    'admin.confirmReset': 'Reset password for this user?',
    'admin.newPasswordTitle': 'New Password',
    'admin.copyPasswordNote': 'Please copy this password for the user. It will not be shown again.',
    'admin.close': 'Close',
    'admin.noUsers': 'No users found',

    /* Limits */
    'limits.quizLimitReached': 'You have reached the quiz limit. Upgrade to Premium for more.',
    'limits.playerLimitReached': 'Player limit reached',
    'limits.upgradeMessage': 'Upgrade to Premium to unlock more features',

    /* Welcome */
    'welcome.approvedMessage': 'Welcome! Your account has been approved.',

    /* Common */
    'common.backHome': '\u2190 Back to Home',
    'common.back': '\u2190 Back',

    'lang.toggle': 'TH'
  }
};

/* ---- helpers ---- */

function getCurrentLang() {
  return localStorage.getItem('zapquiz_lang') || 'th';
}

function setLang(lang) {
  localStorage.setItem('zapquiz_lang', lang);
  applyTranslations();
}

function t(key) {
  const lang = getCurrentLang();
  return (translations[lang] && translations[lang][key]) || key;
}

function applyTranslations() {
  const lang = getCurrentLang();
  const dict = translations[lang] || translations.th;

  // Text content
  document.querySelectorAll('[data-i18n]').forEach(function (el) {
    var key = el.getAttribute('data-i18n');
    if (dict[key] !== undefined) {
      el.textContent = dict[key];
    }
  });

  // Placeholders
  document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
    var key = el.getAttribute('data-i18n-placeholder');
    if (dict[key] !== undefined) {
      el.placeholder = dict[key];
    }
  });

  // Language toggle button
  var toggleBtn = document.getElementById('lang-toggle');
  if (toggleBtn) {
    toggleBtn.textContent = dict['lang.toggle'] || (lang === 'th' ? 'EN' : 'TH');
  }

  // Update html lang attribute
  document.documentElement.lang = lang === 'th' ? 'th' : 'en';
}

/* ---- bootstrap ---- */

document.addEventListener('DOMContentLoaded', function () {
  applyTranslations();

  var toggleBtn = document.getElementById('lang-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', function () {
      var next = getCurrentLang() === 'th' ? 'en' : 'th';
      setLang(next);
    });
  }
});
