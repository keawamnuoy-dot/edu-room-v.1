(() => {
  "use strict";

  const STORAGE_KEY = "eduroom-crru-v1";
  const FONT_SIZE_KEY = "eduroom-font-scale";
  const ACCOUNTS_KEY = "eduroom-demo-accounts";
  const API_URL = "api/index.php";
  const DEFAULT_FONT_SCALE = 1.1;
  const MIN_FONT_SCALE = 1;
  const MAX_FONT_SCALE = 1.3;
  const roleLabels = {
    user: { name: "นภัสสร ใจดี", title: "ผู้ใช้งานทั่วไป · ผู้จอง", initial: "น" },
    admin: { name: "ผู้ดูแลห้องประชุม", title: "ผู้ดูแลห้องและผู้อนุมัติ", initial: "ผ" },
    staff: { name: "สมชาย ดูแลห้อง", title: "เจ้าหน้าที่ดูแลห้อง", initial: "ส" },
    super_admin: { name: "ผู้ดูแลระบบสูงสุด", title: "Super Admin · จัดการระบบทั้งหมด", initial: "ส" }
  };
  const rolePermissions = {
    user: {
      pages: ["dashboard", "rooms", "bookings", "calendar"],
      actions: ["create-booking", "edit-own-booking", "manage-own-booking", "view-own-booking", "notifications"]
    },
    admin: {
      pages: ["dashboard", "rooms", "manage", "bookings", "calendar", "approvals", "members"],
      actions: ["manage-rooms", "approve-booking", "view-any-booking", "create-member", "notifications"]
    },
    staff: {
      pages: ["dashboard", "rooms", "calendar", "staff"],
      actions: ["prepare-rooms", "view-approved-booking", "notifications"]
    },
    super_admin: { pages: ["*"], actions: ["*"] }
  };
  const memberRoleLabels = {
    user: "User · ผู้จอง",
    admin: "Admin · ผู้ดูแลห้อง / อนุมัติ",
    staff: "Staff · เจ้าหน้าที่ผู้รับงาน",
    super_admin: "Super Admin · ผู้ดูแลทั้งหมด"
  };
  const memberPrefixes = ["ศาสตราจารย์", "รองศาสตราจารย์", "ผู้ช่วยศาสตราจารย์", "อาจารย์ ดร.", "อาจารย์", "นาย", "นาง", "นางสาว"];
  const memberTypes = { instructor: "อาจารย์", staff: "เจ้าหน้าที่", student: "นักศึกษา", external: "บุคลากรภายนอก" };
  const monthNames = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
  const weekNames = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
  const longWeekNames = ["วันอาทิตย์", "วันจันทร์", "วันอังคาร", "วันพุธ", "วันพฤหัสบดี", "วันศุกร์", "วันเสาร์"];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isoDate = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const dayOffset = days => { const date = new Date(today); date.setDate(date.getDate() + days); return isoDate(date); };
  const localDateTime = date => `${isoDate(date)}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

  const seedState = () => ({
    role: "user",
    rooms: [
      { id: "room-101", name: "ห้องประชุมราชพฤกษ์", number: "อาคารเรียนรวม · ห้อง 301", building: "อาคารเรียนรวม", capacity: 40, status: "active", description: "ห้องประชุมขนาดกลาง บรรยากาศโปร่งสบาย เหมาะสำหรับประชุมและอบรม", equipment: ["โปรเจกเตอร์", "เครื่องเสียง", "ไมโครโฟน"], visual: "visual-green" },
      { id: "room-102", name: "ห้องประชุมดอกปีบ", number: "อาคารคณะครุศาสตร์ · ห้อง 204", building: "อาคารคณะครุศาสตร์", capacity: 20, status: "active", description: "ห้องประชุมย่อยพร้อมอุปกรณ์นำเสนอ เหมาะกับการประชุมกลุ่มย่อย", equipment: ["จอแสดงผล", "กระดานไวท์บอร์ด"], visual: "visual-blue" },
      { id: "room-103", name: "ห้องประชุมพวงแสด", number: "อาคารเรียนรวม · ห้อง 402", building: "อาคารเรียนรวม", capacity: 80, status: "active", description: "ห้องขนาดใหญ่ รองรับการสัมมนาและกิจกรรมของคณะ", equipment: ["โปรเจกเตอร์", "เครื่องเสียง", "ไมโครโฟน"], visual: "visual-sand" },
      { id: "room-104", name: "ห้องปฏิบัติการนวัตกรรม", number: "อาคารคณะครุศาสตร์ · ห้อง 105", building: "อาคารคณะครุศาสตร์", capacity: 30, status: "active", description: "พื้นที่เรียนรู้ร่วมกัน จัดโต๊ะได้หลายรูปแบบ พร้อมระบบประชุมออนไลน์", equipment: ["จอแสดงผล", "กล้องประชุม"], visual: "visual-lilac" },
      { id: "room-105", name: "ห้องประชุมเวียงเชียงรุ้ง", number: "อาคารเรียนรวม · ห้อง 501", building: "อาคารเรียนรวม", capacity: 120, status: "inactive", description: "ห้องประชุมใหญ่สำหรับกิจกรรมพิเศษและงานประชุมระดับคณะ", equipment: ["โปรเจกเตอร์", "เครื่องเสียง", "ไมโครโฟน"], visual: "visual-green" }
    ],
    bookings: [
      { id: "BK-26001", roomId: "room-102", user: "นภัสสร ใจดี", email: "napatsorn@crru.ac.th", department: "สาขาวิชาการประถมศึกษา", title: "ประชุมวางแผนการสอนภาคเรียนที่ 2", purpose: "ประชุมวางแผนงาน", attendees: 12, startDate: dayOffset(1), endDate: dayOffset(1), startTime: "09:00", endTime: "11:00", equipment: ["จอแสดงผล"], note: "ขอจัดโต๊ะรูปตัวยู", status: "pending", prepStatus: "waiting", createdAt: new Date().toISOString(), signature: "" },
      { id: "BK-26002", roomId: "room-101", user: "อรทัย วงศ์คำ", email: "orathai@crru.ac.th", department: "สาขาวิชาหลักสูตรและการสอน", title: "ประชุมคณะกรรมการประจำหลักสูตร", purpose: "ประชุมคณะกรรมการ", attendees: 18, startDate: dayOffset(2), endDate: dayOffset(2), startTime: "13:00", endTime: "15:00", equipment: ["โปรเจกเตอร์"], note: "", status: "approved", prepStatus: "accepted", createdAt: new Date().toISOString(), signature: "" },
      { id: "BK-26003", roomId: "room-103", user: "นภัสสร ใจดี", email: "napatsorn@crru.ac.th", department: "สาขาวิชาการประถมศึกษา", title: "อบรมเชิงปฏิบัติการพัฒนาสื่อการเรียนรู้", purpose: "อบรม / สัมมนา", attendees: 55, startDate: dayOffset(4), endDate: dayOffset(4), startTime: "08:30", endTime: "12:00", equipment: ["โปรเจกเตอร์", "เครื่องเสียง", "ไมโครโฟน"], note: "จัดเตรียมน้ำดื่มสำหรับผู้เข้าร่วม", status: "approved", prepStatus: "waiting", createdAt: new Date().toISOString(), signature: "" },
      { id: "BK-26004", roomId: "room-104", user: "ปรีชา แสนคำ", email: "preecha@crru.ac.th", department: "สาขาวิชาเทคโนโลยีการศึกษา", title: "หารือแนวทางพัฒนาห้องเรียนดิจิทัล", purpose: "ประชุมโครงการ", attendees: 9, startDate: dayOffset(6), endDate: dayOffset(6), startTime: "10:00", endTime: "12:00", equipment: ["กล้องประชุม"], note: "", status: "pending", prepStatus: "waiting", createdAt: new Date().toISOString(), signature: "" },
      { id: "BK-26005", roomId: "room-102", user: "นภัสสร ใจดี", email: "napatsorn@crru.ac.th", department: "สาขาวิชาการประถมศึกษา", title: "หารือโครงงานนักศึกษาฝึกประสบการณ์", purpose: "ประชุมกลุ่มย่อย", attendees: 8, startDate: dayOffset(8), endDate: dayOffset(8), startTime: "13:00", endTime: "14:30", equipment: [], note: "", status: "approved", prepStatus: "completed", createdAt: new Date().toISOString(), signature: "" }
    ],
    notifications: [
      { id: "n1", title: "ยินดีต้อนรับสู่ EduRoom", text: "เลือกห้องประชุมที่ต้องการ แล้วส่งคำขอจองพร้อมลายเซ็นอิเล็กทรอนิกส์", time: new Date().toISOString(), read: false },
      { id: "n2", title: "ระบบแจ้งเตือนอัตโนมัติ", text: "การแจ้งเตือนอีเมลและ LINE แสดงเป็นตัวอย่างในต้นแบบนี้", time: new Date().toISOString(), read: false }
    ],
    policy: { editUntil: "start", allowPastCancel: false, allowDelete: true, maxDaysAhead: 90, maxDurationHours: 8, requireSignature: true, notifyEmail: true, notifyLine: false, deletableStatuses: ["rejected", "cancelled"] }
  });

  let state = seedState();
  let authSession = null;
  let csrfToken = "";
  let stateVersion = 0;
  let saveQueue = Promise.resolve();
  let migrationCompleted = false;
  let members = [];
  let membersLoaded = false;
  let membersLoading = false;
  let membersLoadError = "";
  let statisticsData = null;
  let statisticsLoading = false;
  let statisticsLoadError = "";
  let memberSearch = "";
  let memberRoleFilter = "all";
  let staffMembers = [];
  let staffMembersLoaded = false;
  let staffMembersLoading = false;
  let staffMembersError = "";
  let staffStateRefreshAt = 0;
  const approvalAssignments = {};
  let currentPage = "dashboard";
  let calendarMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  let statisticsMonth = isoDate(today).slice(0, 7);
  let roomFilter = "all";
  let bookingFilter = "all";
  let approvalFilter = "pending";
  let roomSearch = "";
  let signatureDirty = false;
  let notificationModal = false;
  let fontScale = loadFontScale();

  const $ = selector => document.querySelector(selector);
  function can(action) {
    const permissions = rolePermissions[authSession?.role];
    return Boolean(permissions && (permissions.actions.includes("*") || permissions.actions.includes(action)));
  }
  async function api(action, payload = null, query = {}) {
    const search = new URLSearchParams({ action, ...query });
    const response = await fetch(`${API_URL}?${search}`, {
      method: payload === null ? "GET" : "POST",
      credentials: "same-origin",
      headers: payload === null ? {} : { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
      body: payload === null ? undefined : JSON.stringify(payload)
    });
    let result;
    const contentType = response.headers.get("content-type") || "";
    const responseText = await response.text();
    try {
      result = JSON.parse(responseText);
    } catch {
      const preview = responseText.trim().slice(0, 80);
      throw new Error(`เซิร์ฟเวอร์ส่งข้อมูลไม่ถูกต้อง: ต้องใช้ PHP API ไม่ใช่ Static Site (${response.status}, ${contentType || "ไม่มี Content-Type"}${preview ? `, ${preview}` : ""})`);
    }
    if (result.csrfToken) csrfToken = result.csrfToken;
    if (!response.ok) throw new Error(result.error || `คำขอไม่สำเร็จ (${response.status})`);
    return result;
  }
  function mergeServerState(serverState) {
    const seed = seedState();
    if (!serverState || !Array.isArray(serverState.rooms) || !Array.isArray(serverState.bookings)) return seed;
    return {
      ...seed,
      ...serverState,
      role: "user",
      rooms: serverState.rooms,
      bookings: serverState.bookings,
      policy: { ...seed.policy, ...(serverState.policy || {}) },
      notifications: Array.isArray(serverState.notifications) ? serverState.notifications : []
    };
  }
  function canAccessPage(page) {
    const permissions = rolePermissions[authSession?.role];
    return Boolean(permissions && (permissions.pages.includes("*") || permissions.pages.includes(page)));
  }
  function isBookingOwner(booking) {
    return Boolean(authSession?.email && booking.email && booking.email === authSession.email);
  }
  function canViewBooking(booking) {
    if (!booking) return false;
    if (can("view-any-booking")) return true;
    if (can("view-approved-booking") && booking.status === "approved") return true;
    return can("view-own-booking") && isBookingOwner(booking);
  }
  function visibleBookings() {
    if (can("view-any-booking")) return state.bookings;
    if (can("view-approved-booking")) return state.bookings.filter(item => item.status === "approved");
    return state.bookings.filter(isBookingOwner);
  }
  function loadFontScale() {
    try {
      const savedScale = Number(localStorage.getItem(FONT_SIZE_KEY));
      return Number.isFinite(savedScale) && savedScale >= MIN_FONT_SCALE && savedScale <= MAX_FONT_SCALE
        ? Math.round(savedScale * 10) / 10
        : DEFAULT_FONT_SCALE;
    } catch (error) {
      console.error("EduRoom could not read the saved font size:", error);
      return DEFAULT_FONT_SCALE;
    }
  }
  function setFontScale(nextScale) {
    fontScale = Math.min(MAX_FONT_SCALE, Math.max(MIN_FONT_SCALE, Math.round(nextScale * 10) / 10));
    document.documentElement.dataset.fontScale = String(fontScale);
    document.documentElement.style.setProperty("--type-scale", String(fontScale));
    $("#fontSizeValue").textContent = `${Math.round(fontScale * 100)}%`;
    $("#fontSizeDecrease").disabled = fontScale <= MIN_FONT_SCALE;
    $("#fontSizeIncrease").disabled = fontScale >= MAX_FONT_SCALE;
    try {
      localStorage.setItem(FONT_SIZE_KEY, String(fontScale));
    } catch (error) {
      console.error("EduRoom could not save the selected font size:", error);
      toast("บันทึกขนาดตัวอักษรไม่สำเร็จ", true, "เบราว์เซอร์นี้ไม่อนุญาตให้บันทึกการตั้งค่า");
    }
  }
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const roomById = id => state.rooms.find(room => room.id === id);
  const fullDate = value => {
    if (!value) return "—";
    const [year, month, day] = value.split("-").map(Number);
    return `${day} ${monthNames[month - 1]} ${year + 543}`;
  };
  const shortDate = value => {
    if (!value) return "—";
    const [year, month, day] = value.split("-").map(Number);
    return `${day} ${monthNames[month - 1].slice(0, 3)}`;
  };
  const timestamp = value => {
    try { return new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }
    catch { return ""; }
  };
  const safeSave = () => {
    if (!authSession) return false;
    const snapshot = JSON.parse(JSON.stringify(state));
    saveQueue = saveQueue.then(async () => {
      try {
        const result = await api("state", { state: snapshot, expectedVersion: stateVersion });
        stateVersion = result.version;
        if (Array.isArray(result.emailWarnings) && result.emailWarnings.length) {
          const failed = result.emailWarnings.reduce((total, warning) => total + Number(warning.failed || 0), 0);
          const missingRecipients = result.emailWarnings.some(warning => warning.recipients === 0);
          toast(
            "บันทึกข้อมูลแล้ว แต่ส่งอีเมลแจ้งเตือนไม่สำเร็จ",
            true,
            missingRecipients ? "ไม่พบอีเมลผู้รับที่เปิดใช้งาน กรุณาตรวจสอบบัญชีผู้อนุมัติ/เจ้าหน้าที่" : `มีอีเมล ${failed} ฉบับที่ส่งไม่สำเร็จ กรุณาตรวจสอบการตั้งค่า SMTP`
          );
        }
      } catch (error) {
        toast(`บันทึกข้อมูลไม่สำเร็จ: ${error.message}`, true);
        try {
          const latest = await api("state");
          stateVersion = latest.version;
          if (latest.state) {
            state = mergeServerState(latest.state);
            render();
          }
        } catch (reloadError) {
          toast(`โหลดข้อมูลจากฐานข้อมูลไม่สำเร็จ: ${reloadError.message}`, true);
        }
      }
    });
    return true;
  };

  function currentUserName() {
    if (!authSession) return roleLabels[state.role]?.name || roleLabels.user.name;
    return `${authSession.namePrefix ? `${authSession.namePrefix} ` : ""}${authSession.name}`;
  }

  function currentUserFirstName() {
    return authSession?.name?.trim().split(/\s+/)[0] || currentUserName().split(/\s+/)[0];
  }

  function setAuthenticatedView(isAuthenticated) {
    $("#loginScreen").hidden = isAuthenticated;
    $(".app-shell").hidden = !isAuthenticated;
    document.title = isAuthenticated ? "EduRoom — ระบบจองห้องประชุม" : "เข้าสู่ระบบ — EduRoom";
  }

  function updateProfile() {
    const account = authSession;
    if (!account) return;
    const user = roleLabels[account.role];
    const name = currentUserName() || user.name;
    $("#userName").textContent = name;
    $("#userRole").textContent = user.title;
    setProfileAvatar($("#userAvatar"), account.profileImage, name.trim().charAt(0) || user.initial);
    setProfileAvatar($("#menuAvatar"), account.profileImage, name.trim().charAt(0) || user.initial);
    $("#menuUserName").textContent = name;
    $("#menuUserEmail").textContent = account.email;
    $("#editProfileButton").hidden = account.role !== "super_admin";
  }

  function setProfileAvatar(element, image, initial) {
    element.replaceChildren();
    if (image) {
      const photo = document.createElement("img");
      photo.src = image;
      photo.alt = "";
      element.append(photo);
    } else {
      element.textContent = initial;
    }
  }

  function prefixOptions(selected = "") {
    return `<option value="">เลือกคำนำหน้า</option>${memberPrefixes.map(prefix => `<option value="${esc(prefix)}" ${prefix === selected ? "selected" : ""}>${esc(prefix)}</option>`).join("")}`;
  }

  function memberTypeOptions(selected = "") {
    return `<option value="">เลือกสถานะ</option>${Object.entries(memberTypes).map(([value, label]) => `<option value="${value}" ${value === selected ? "selected" : ""}>${label}</option>`).join("")}`;
  }

  function profileImageField(id, required, image = "") {
    return `<div class="form-field full"><label for="${id}">รูปโปรไฟล์${required ? '<span class="required">*</span>' : ""}</label><input class="upload-input" id="${id}" name="profileImageFile" type="file" accept="image/jpeg,image/png,image/webp" ${required ? "required" : ""}><img class="profile-image-preview" data-profile-preview alt="ตัวอย่างรูปโปรไฟล์" src="${image ? esc(image) : ""}" ${image ? "" : "hidden"}><span class="field-hint">${required ? "จำเป็นสำหรับบัญชีใหม่ · " : "หากไม่เลือกรูปใหม่จะคงรูปเดิม · "}JPG, PNG หรือ WebP ขนาดไม่เกิน 2 MB</span></div>`;
  }

  function bindProfileImagePreview(form) {
    const input = form.querySelector('input[name="profileImageFile"]');
    const preview = form.querySelector("[data-profile-preview]");
    if (!input || !preview) return;
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        preview.src = await readProfileImage(file);
        preview.hidden = false;
      } catch (error) {
        input.value = "";
        toast(error.message, true);
      }
    });
  }

  function readProfileImage(file) {
    if (!file || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      return Promise.reject(new Error("กรุณาเลือกไฟล์รูป JPG, PNG หรือ WebP"));
    }
    if (file.size > 2 * 1024 * 1024) {
      return Promise.reject(new Error("รูปโปรไฟล์ต้องมีขนาดไม่เกิน 2 MB"));
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("อ่านไฟล์รูปโปรไฟล์ไม่สำเร็จ"));
      reader.onerror = () => reject(new Error("อ่านไฟล์รูปโปรไฟล์ไม่สำเร็จ"));
      reader.readAsDataURL(file);
    });
  }

  async function selectedProfileImage(form, existingImage = "", required = false) {
    const file = form.querySelector('input[name="profileImageFile"]')?.files?.[0];
    if (file) return readProfileImage(file);
    if (existingImage) return existingImage;
    if (required) throw new Error("กรุณาแนบรูปโปรไฟล์");
    return "";
  }

  function setAuthView(view) {
    const registering = view === "register";
    $("#loginForm").hidden = registering;
    $("#loginSwitch").hidden = registering;
    $(".login-notice").hidden = registering;
    $("#registerForm").hidden = !registering;
    $("#loginHeading").textContent = registering ? "สมัครสมาชิก" : "เข้าสู่ระบบ";
    $("#loginDescription").textContent = registering
      ? "สร้างบัญชีเพื่อส่งคำขอจองห้องประชุม"
      : "เข้าสู่ระบบด้วยบัญชีมหาวิทยาลัยเพื่อจัดการห้องประชุม";
    if (!registering) $("#registerForm").reset();
    showLoginError("");
    $("#registerError").hidden = true;
    if (registering) $("#registerName").focus();
    else $("#loginEmail").focus();
  }

  function showLoginError(message) {
    const error = $("#loginError");
    error.textContent = message;
    error.hidden = !message;
  }

  async function activateAccount(account) {
    authSession = account;
    state.role = account.role;
    const serverState = await api("state");
    stateVersion = serverState.version;
    state = mergeServerState(serverState.state);
    currentPage = "dashboard";
    updateProfile();
    setAuthenticatedView(true);
    updateNotificationDot();
    await updateMigrationControl();
    render();
  }

  async function signIn(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email")).trim().toLowerCase();
    const password = String(form.get("password"));
    try {
      const result = await api("login", { email, password });
      await activateAccount(result.user);
      event.currentTarget.reset();
      showLoginError("");
      toast(`เข้าสู่ระบบสำเร็จ · ${roleLabels[result.user.role].title}`);
    } catch (error) {
      showLoginError(error.message);
    }
  }

  async function registerAccount(event) {
    event.preventDefault();
    const registerForm = event.currentTarget;
    const form = new FormData(registerForm);
    const email = String(form.get("email")).trim().toLowerCase();
    const name = String(form.get("name")).trim().replace(/\s+/g, " ");
    const namePrefix = String(form.get("namePrefix") || "");
    const memberType = String(form.get("memberType") || "");
    const department = String(form.get("department")).trim();
    const phone = String(form.get("phone")).trim();
    const password = String(form.get("password"));
    const passwordConfirm = String(form.get("passwordConfirm"));
    const error = $("#registerError");
    const fail = message => { error.textContent = message; error.hidden = false; };
    if (!email.endsWith("@crru.ac.th")) {
      fail("กรุณาใช้อีเมลมหาวิทยาลัยที่ลงท้ายด้วย @crru.ac.th");
      return;
    }
    if (!/^[0-9+()\s-]{9,20}$/.test(phone)) {
      fail("กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง (9–20 หลัก)");
      return;
    }
    if (password.length < 8 || new TextEncoder().encode(password).length > 72) {
      fail("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษรและมีขนาดไม่เกิน 72 ไบต์");
      return;
    }
    if (password !== passwordConfirm) {
      fail("รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน");
      return;
    }
    if (!form.has("consent")) {
      fail("กรุณายืนยันความถูกต้องของข้อมูลก่อนสมัครสมาชิก");
      return;
    }
    try {
      const profileImage = await selectedProfileImage(registerForm, "", true);
      const result = await api("register", { email, namePrefix, name, memberType, department, phone, profileImage, password });
      await activateAccount(result.user);
      registerForm.reset();
      toast("สมัครสมาชิกและเข้าสู่ระบบสำเร็จ");
    } catch (requestError) {
      fail(requestError.message);
    }
  }

  async function signOut() {
    try {
      await api("logout", {});
    } catch (error) {
      toast(`ออกจากระบบไม่สำเร็จ: ${error.message}`, true);
      return;
    }
    authSession = null;
    $("#profileMenu").hidden = true;
    $("#profileButton").setAttribute("aria-expanded", "false");
    setAuthenticatedView(false);
    showLoginError("");
    $("#loginPassword").value = "";
    $("#loginEmail").focus();
  }

  async function updateMigrationControl() {
    const button = $("#legacyMigration");
    if (!authSession || authSession.role !== "super_admin") {
      button.hidden = true;
      return;
    }
    const result = await api("migration-status");
    migrationCompleted = result.completed;
    button.hidden = migrationCompleted;
  }

  async function migrateLegacyData() {
    if (!authSession || authSession.role !== "super_admin") {
      toast("เฉพาะ Super Admin เท่านั้นที่นำเข้าข้อมูลได้", true);
      return;
    }
    if (!window.confirm("นำเข้าข้อมูล localStorage และบัญชีสมาชิกจากเบราว์เซอร์นี้ไปยัง MySQL? การนำเข้าทำได้ครั้งเดียว และจะลบรหัสผ่านเก่าที่เก็บในเบราว์เซอร์หลังสำเร็จ")) return;
    try {
      const rawState = localStorage.getItem(STORAGE_KEY);
      if (!rawState) {
        toast("ไม่พบข้อมูลเดิมใน localStorage ของโดเมนนี้", true, "เปิดระบบจาก localhost/bookmain และใช้เบราว์เซอร์/โปรไฟล์เดิมที่เก็บข้อมูล");
        return;
      }
      const legacyState = JSON.parse(rawState);
      const rawAccounts = localStorage.getItem(ACCOUNTS_KEY);
      const accounts = rawAccounts ? JSON.parse(rawAccounts) : [];
      if (!Array.isArray(accounts)) throw new Error("ข้อมูลบัญชีเดิมมีรูปแบบไม่ถูกต้อง");
      const result = await api("migrate", { state: legacyState, accounts });
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(ACCOUNTS_KEY);
      localStorage.removeItem("eduroom-demo-session");
      const latest = await api("state");
      stateVersion = latest.version;
      state = mergeServerState(latest.state);
      await updateMigrationControl();
      render();
      toast("นำเข้าข้อมูลเดิมสำเร็จ", false, `ห้อง ${result.rooms} ห้อง · รายการจอง ${result.bookings} รายการ · บัญชีผู้ใช้ ${result.importedAccounts} บัญชี (กำหนดเป็น User)${result.skippedAccounts ? ` · ข้ามบัญชีที่ข้อมูลไม่ผ่าน ${result.skippedAccounts} บัญชี` : ""}`);
    } catch (error) {
      toast(`นำเข้าข้อมูลไม่สำเร็จ: ${error.message}`, true);
    }
  }

  function toast(message, isError = false, detail = "") {
    const node = document.createElement("div");
    node.className = `toast${isError ? " error" : ""}`;
    node.innerHTML = `${esc(message)}${detail ? `<small>${esc(detail)}</small>` : ""}`;
    $("#toastRegion").append(node);
    window.setTimeout(() => node.remove(), 4200);
  }
  function addNotification(title, text) {
    state.notifications.unshift({ id: `N-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, title, text, time: new Date().toISOString(), read: false });
    state.notifications = state.notifications.slice(0, 40);
    safeSave();
    updateNotificationDot();
  }
  function updateNotificationDot() {
    const unread = state.notifications.some(item => !item.read);
    $("#notificationDot").style.display = unread ? "block" : "none";
  }
  function statusInfo(booking) {
    if (booking.status === "pending") return ["รออนุมัติ", "status-pending"];
    if (booking.status === "rejected") return ["ไม่อนุมัติ", "status-rejected"];
    if (booking.status === "cancelled") return ["ยกเลิกแล้ว", "status-completed"];
    if (booking.status === "completed" || booking.prepStatus === "completed") return ["เสร็จสิ้น", "status-completed"];
    if (booking.status === "approved" && booking.prepStatus === "waiting") return ["ส่งต่อเจ้าหน้าที่", "status-staff"];
    if (booking.status === "approved" && booking.prepStatus === "accepted") return ["เจ้าหน้าที่รับงาน", "status-staff"];
    if (booking.status === "approved" && booking.prepStatus === "preparing") return ["กำลังเตรียมห้อง", "status-staff"];
    return ["อนุมัติแล้ว", "status-approved"];
  }
  const badge = booking => { const [label, style] = statusInfo(booking); return `<span class="status-badge ${style}">${label}</span>`; };
  const activeBooking = booking => !["rejected", "cancelled"].includes(booking.status) && booking.status !== "completed";
  const overlaps = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && bStart < aEnd;
  function bookingsConflict(roomId, startDate, endDate, startTime, endTime, excludedId = "") {
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    for (const booking of state.bookings) {
      if (booking.id === excludedId || booking.roomId !== roomId || !activeBooking(booking)) continue;
      const otherStart = new Date(`${booking.startDate}T00:00:00`);
      const otherEnd = new Date(`${booking.endDate}T00:00:00`);
      if (overlaps(start, new Date(end.getTime() + 86400000), otherStart, new Date(otherEnd.getTime() + 86400000)) &&
          overlaps(startTime, endTime, booking.startTime, booking.endTime)) return booking;
    }
    return null;
  }
  function allowedToCancel(booking) {
    if ((!can("manage-own-booking") || !isBookingOwner(booking)) && !can("manage-all-bookings")) return false;
    if (!["pending", "approved"].includes(booking.status)) return false;
    if (!state.policy.allowPastCancel && `${booking.startDate}T${booking.startTime}` < localDateTime(new Date())) return false;
    return true;
  }
  function allowedToEdit(booking) {
    if ((!can("edit-own-booking") || !isBookingOwner(booking)) && !can("manage-all-bookings")) return false;
    if (booking.status !== "pending") return false;
    const cutoffDate = state.policy.editUntil === "end" ? booking.endDate : booking.startDate;
    const cutoffTime = state.policy.editUntil === "end" ? booking.endTime : booking.startTime;
    return `${cutoffDate}T${cutoffTime}` > localDateTime(new Date());
  }
  function navigate(page) {
    if (!canAccessPage(page)) {
      toast("บัญชีของคุณไม่มีสิทธิ์เข้าถึงหน้านี้", true);
      return;
    }
    currentPage = page;
    $("#sidebar").classList.remove("open");
    document.querySelectorAll(".nav-link").forEach(link => link.classList.toggle("active", link.dataset.page === page));
    const active = document.querySelector(`.nav-link[data-page="${page}"]`);
    $("#pageCrumb").textContent = active ? active.textContent.trim().replace(/\d+$/, "").trim() : "ภาพรวม";
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function updateNavigationPermissions() {
    document.querySelectorAll(".nav-link[data-page]").forEach(link => {
      link.hidden = !canAccessPage(link.dataset.page);
    });
    const bookingLink = document.querySelector('.nav-link[data-page="bookings"]');
    const bookingLabel = Array.from(bookingLink.childNodes).find(node => node.nodeType === Node.TEXT_NODE);
    if (bookingLabel) bookingLabel.nodeValue = can("view-any-booking") ? "รายการจองทั้งหมด" : "การจองของฉัน";
    document.querySelectorAll(".nav-group-label[data-nav-group]").forEach(label => {
      const links = document.querySelectorAll(`.nav-link[data-nav-group="${label.dataset.navGroup}"]`);
      label.hidden = !Array.from(links).some(link => !link.hidden);
    });
  }
  function heading(kicker, title, subtitle, action = "") {
    return `<div class="page-heading"><div><div class="eyebrow">${kicker}</div><h1>${title}</h1><p class="page-subtitle">${subtitle}</p></div>${action}</div>`;
  }
  function pageButton(label, action, icon = "+") {
    return `<button class="primary-button" data-action="${action}"><span class="button-icon">${icon}</span>${label}</button>`;
  }
  function roomCard(room) {
    const hiddenImage = room.image ? `<img class="room-image" src="${esc(room.image)}" alt="${esc(room.name)}">` : "";
    const equipment = (room.equipment || []).slice(0, 3).join(" · ") || "อุปกรณ์มาตรฐาน";
    const managementActions = currentPage === "manage" ? `<div class="table-actions"><button class="icon-action" data-action="edit-room" data-id="${esc(room.id)}" title="แก้ไขห้อง">✎</button><button class="icon-action" data-action="toggle-room" data-id="${esc(room.id)}" title="${room.status === "active" ? "ปิดใช้งาน" : "เปิดใช้งาน"}">${room.status === "active" ? "Ⅱ" : "▶"}</button><button class="icon-action" data-action="delete-room" data-id="${esc(room.id)}" title="ลบห้อง">⌫</button></div>` : "";
    return `<article class="card room-card">
      <div class="room-visual ${esc(room.visual || "visual-green")}"><span class="window"></span><span class="window"></span>${hiddenImage}<span class="visual-label">CRRU · EDU ROOM</span></div>
      <div class="room-card-body"><div class="room-card-head"><div><div class="room-name">${esc(room.name)}</div><div class="room-number">${esc(room.number)}</div></div><span class="available-tag">${room.status === "active" ? "พร้อมใช้งาน" : "ปิดใช้งาน"}</span></div>
        <div class="room-meta"><span>♧ ${room.capacity} ที่นั่ง</span><span>⌂ ${esc(room.building)}</span></div>
        <p class="room-description">${esc(room.description || "ห้องประชุมสำหรับบุคลากรและหน่วยงานของคณะ")}</p>
        <div class="room-card-foot"><span class="room-equipment">${esc(equipment)}</span>${currentPage === "manage" ? managementActions : room.status === "active" ? `<button class="text-link" data-action="book-room" data-id="${esc(room.id)}">จองห้อง ↗</button>` : `<span class="room-equipment">ปิดให้บริการ</span>`}</div>
      </div></article>`;
  }
  function dashboardPage() {
    const bookings = visibleBookings();
    const mine = state.bookings.filter(isBookingOwner);
    const pending = bookings.filter(item => item.status === "pending");
    const approved = bookings.filter(item => item.status === "approved");
    const monthStart = isoDate(new Date(today.getFullYear(), today.getMonth(), 1));
    const nextMonthStart = isoDate(new Date(today.getFullYear(), today.getMonth() + 1, 1));
    const monthBookings = bookings
      .filter(item => item.startDate < nextMonthStart && item.endDate >= monthStart)
      .sort((a, b) => `${a.startDate}${a.startTime}`.localeCompare(`${b.startDate}${b.startTime}`));
    const monthlyRows = monthBookings.map(item => {
      const room = roomById(item.roomId);
      const dateRange = `${shortDate(item.startDate)}${item.endDate !== item.startDate ? ` – ${shortDate(item.endDate)}` : ""}`;
      const equipment = item.equipment?.length ? item.equipment.join(", ") : "ไม่ระบุ";
      return `<tr>
        <td><span class="table-primary">${esc(item.title)}</span><span class="table-secondary">${esc(item.user)} · ${esc(item.department || "ไม่ระบุหน่วยงาน")}</span></td>
        <td>${esc(room?.name || "ไม่พบห้อง")}<span class="table-secondary">${esc(room?.number || "")}</span></td>
        <td class="date-cell">${dateRange}</td>
        <td class="date-cell">${item.startTime}–${item.endTime}</td>
        <td>${item.attendees} คน<span class="table-secondary">${esc(item.purpose || "ไม่ระบุวัตถุประสงค์")}</span></td>
        <td>${esc(equipment)}<span class="table-secondary">${esc(item.note || "ไม่มีหมายเหตุ")}</span></td>
        <td>${badge(item)}</td>
        <td><button class="secondary-button button-small" data-action="view-booking" data-id="${esc(item.id)}">รายละเอียด</button></td>
      </tr>`;
    });
    const bookingAction = can("create-booking") ? `<button class="banner-action" data-action="new-booking">＋ &nbsp;จองห้องประชุม</button>` : "";
    const bookingLinks = `<button class="quick-link" data-page="rooms">▦ ดูห้องทั้งหมด</button>${canAccessPage("calendar") ? '<button class="quick-link" data-page="calendar">▦ เปิดปฏิทิน</button>' : ""}${can("create-booking") ? '<button class="quick-link" data-action="new-booking">＋ สร้างคำขอจอง</button>' : ""}${canAccessPage("members") ? '<button class="quick-link" data-page="members">♙ จัดการสมาชิกทั้งหมด</button>' : ""}`;
    return `<section class="welcome-banner"><div class="banner-content"><div class="banner-kicker">${longWeekNames[today.getDay()]}ที่ ${today.getDate()} ${monthNames[today.getMonth()]} ${today.getFullYear() + 543} · คณะครุศาสตร์</div><h1>สวัสดี, ${esc(currentUserFirstName())} 👋</h1><p>หาห้องที่ใช่ แล้วเริ่มต้นการประชุมที่มีประสิทธิภาพไปด้วยกัน</p></div>${bookingAction}</section>
      <section class="stat-grid">
        <article class="stat-card"><div><div class="stat-label">ห้องที่เปิดให้บริการ</div><div class="stat-value">${state.rooms.filter(r => r.status === "active").length}</div><div class="stat-note">จากทั้งหมด ${state.rooms.length} ห้อง</div></div><span class="stat-icon icon-green">▦</span></article>
        <article class="stat-card"><div><div class="stat-label">คำขอรออนุมัติ</div><div class="stat-value">${pending.length}</div><div class="stat-note"><em>รอดำเนินการ</em> จากผู้อนุมัติ</div></div><span class="stat-icon icon-orange">☷</span></article>
        <article class="stat-card"><div><div class="stat-label">อนุมัติแล้ว</div><div class="stat-value">${approved.length}</div><div class="stat-note">รายการจองที่กำลังดำเนินการ</div></div><span class="stat-icon icon-blue">✓</span></article>
        <article class="stat-card"><div><div class="stat-label">รายการจองของฉัน</div><div class="stat-value">${mine.length}</div><div class="stat-note">ติดตามสถานะได้ทุกเมื่อ</div></div><span class="stat-icon icon-purple">▤</span></article>
      </section>
      <article class="card section-card dashboard-month-card">
        <div class="section-title-row"><div><h2 class="section-title">รายการจองประจำเดือน${monthNames[today.getMonth()]} ${today.getFullYear() + 543}</h2><div class="section-caption">แสดง ${monthBookings.length} รายการที่มีวันใช้งานอยู่ในเดือนนี้ · ตามสิทธิ์ของบัญชี</div></div>${canAccessPage("bookings") ? '<button class="text-link" data-page="bookings">ไปหน้ารายการจอง →</button>' : ""}</div>
        ${monthBookings.length ? `<div class="table-wrap"><table class="data-table dashboard-month-table"><thead><tr><th>หัวข้อ / ผู้จอง</th><th>ห้องประชุม</th><th>วันที่ใช้งาน</th><th>เวลา</th><th>จำนวน / วัตถุประสงค์</th><th>อุปกรณ์ / หมายเหตุ</th><th>สถานะ</th><th>ดูข้อมูล</th></tr></thead><tbody>${monthlyRows.join("")}</tbody></table></div>` : `<div class="empty-state">ไม่มีรายการจองในเดือนนี้</div>`}
        <div class="quick-links">${bookingLinks}</div>
      </article>
      <section class="card section-card" style="margin-top:15px"><div class="section-title-row"><div><h2 class="section-title">ห้องประชุมแนะนำ</h2><div class="section-caption">เลือกห้องให้เหมาะกับรูปแบบการประชุมของคุณ</div></div><button class="text-link" data-page="rooms">ดูห้องทั้งหมด →</button></div><div class="room-grid">${state.rooms.filter(room => room.status === "active").slice(0, 3).map(roomCard).join("")}</div></section>`;
  }
  function roomsPage(manage = false) {
    if (manage && !can("manage-rooms")) return "";
    const visibleRooms = state.rooms.filter(room => {
      const matches = `${room.name} ${room.number} ${room.building}`.toLowerCase().includes(roomSearch.toLowerCase());
      return matches && (roomFilter === "all" || room.status === roomFilter);
    });
    const title = manage ? "จัดการห้องประชุม" : "ห้องประชุม";
    const action = manage ? pageButton("เพิ่มห้องใหม่", "add-room") : can("create-booking") ? pageButton("จองห้อง", "new-booking") : "";
    return `${heading(manage ? "ROOM MANAGEMENT" : "ROOM DIRECTORY", title, manage ? "จัดการข้อมูลห้อง ความจุ อุปกรณ์ และสถานะการเปิดใช้งาน" : "เลือกพื้นที่ประชุมที่เหมาะกับกิจกรรม พร้อมตรวจสอบข้อมูลห้องและอุปกรณ์", action)}
      <div class="toolbar"><div class="search-box"><input id="roomSearch" type="search" placeholder="ค้นหาชื่อห้อง อาคาร หรือเลขห้อง..." value="${esc(roomSearch)}"></div><select class="filter-select" id="roomFilter"><option value="all" ${roomFilter === "all" ? "selected" : ""}>ทุกสถานะ</option><option value="active" ${roomFilter === "active" ? "selected" : ""}>พร้อมใช้งาน</option><option value="inactive" ${roomFilter === "inactive" ? "selected" : ""}>ปิดใช้งาน</option></select></div>
      ${visibleRooms.length ? `<div class="room-grid">${visibleRooms.map(roomCard).join("")}</div>` : `<article class="card empty-state">ไม่พบห้องประชุมตามเงื่อนไข</article>`}`;
  }
  function bookingsPage() {
    const mine = visibleBookings();
    const filtered = mine.filter(item => bookingFilter === "all" || item.status === bookingFilter);
    const action = can("create-booking") ? pageButton("สร้างคำขอจอง", "new-booking") : "";
    const title = can("view-any-booking") ? "รายการจองในระบบ" : "การจองของฉัน";
    const rows = filtered.map(item => {
      const room = roomById(item.roomId);
      const editable = allowedToEdit(item);
      const deletable = (can("manage-own-booking") && isBookingOwner(item) || can("manage-all-bookings")) &&
        state.policy.allowDelete && state.policy.deletableStatuses.includes(item.status);
      return `<tr><td><span class="table-primary">${esc(item.title)}</span><span class="table-secondary">${esc(item.department || item.user)}</span></td><td>${esc(room?.name || "ไม่พบห้อง")}<span class="table-secondary">${esc(room?.number || "")}</span></td><td>${esc(fullDate(item.startDate))}${item.endDate !== item.startDate ? `<span class="table-secondary">ถึง ${esc(fullDate(item.endDate))}</span>` : ""}</td><td>${item.startTime}–${item.endTime}</td><td>${badge(item)}</td><td><div class="table-actions"><button class="icon-action" data-action="view-booking" data-id="${esc(item.id)}" title="ดูรายละเอียด">⌕</button>${editable ? `<button class="icon-action" data-action="edit-booking" data-id="${esc(item.id)}" title="แก้ไข">✎</button>` : ""}${allowedToCancel(item) ? `<button class="icon-action" data-action="cancel-booking" data-id="${esc(item.id)}" title="ยกเลิก">×</button>` : ""}${deletable ? `<button class="icon-action" data-action="delete-booking" data-id="${esc(item.id)}" title="ลบรายการ">⌫</button>` : ""}</div></td></tr>`;
    });
    return `${heading("MY RESERVATIONS", title, "ตรวจสอบสถานะ เปิดดูรายละเอียด และจัดการคำขอตามกฎการจอง", action)}
      <div class="toolbar"><select id="bookingFilter" class="filter-select"><option value="all" ${bookingFilter === "all" ? "selected" : ""}>ทุกสถานะ</option><option value="pending" ${bookingFilter === "pending" ? "selected" : ""}>รออนุมัติ</option><option value="approved" ${bookingFilter === "approved" ? "selected" : ""}>อนุมัติแล้ว</option><option value="rejected" ${bookingFilter === "rejected" ? "selected" : ""}>ไม่อนุมัติ</option><option value="cancelled" ${bookingFilter === "cancelled" ? "selected" : ""}>ยกเลิกแล้ว</option></select><span class="section-caption">${filtered.length} รายการ</span></div>
      <article class="card table-card"><div class="table-wrap"><table class="data-table"><thead><tr><th>หัวข้อ / หน่วยงาน</th><th>ห้องประชุม</th><th>วันที่ใช้งาน</th><th>เวลา</th><th>สถานะ</th><th>จัดการ</th></tr></thead><tbody>${rows.length ? rows.join("") : `<tr><td colspan="6"><div class="empty-state">ไม่พบรายการจอง</div></td></tr>`}</tbody></table></div><div class="pagination"><span>แสดง ${rows.length} จาก ${mine.length} รายการ</span><span>การแก้ไขทำได้เฉพาะคำขอที่รออนุมัติ</span></div></article>`;
  }
  function calendarPage() {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstWeekDay = new Date(year, month, 1).getDay();
    const daysCount = new Date(year, month + 1, 0).getDate();
    const previousDays = new Date(year, month, 0).getDate();
    const count = Math.ceil((firstWeekDay + daysCount) / 7) * 7;
    const visibleBookings = state.bookings.filter(item => item.status === "approved");
    let cells = "";
    for (let index = 0; index < count; index++) {
      let day, cellYear = year, cellMonth = month, muted = false;
      if (index < firstWeekDay) { day = previousDays - firstWeekDay + index + 1; cellMonth--; muted = true; if (cellMonth < 0) { cellMonth = 11; cellYear--; } }
      else if (index >= firstWeekDay + daysCount) { day = index - firstWeekDay - daysCount + 1; cellMonth++; muted = true; if (cellMonth > 11) { cellMonth = 0; cellYear++; } }
      else day = index - firstWeekDay + 1;
      const dateStr = `${cellYear}-${String(cellMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const items = visibleBookings.filter(item => item.startDate <= dateStr && item.endDate >= dateStr);
      cells += `<div class="calendar-day${muted ? " muted-day" : ""}${dateStr === isoDate(today) ? " today" : ""}"><span class="calendar-day-number">${day}</span>${items.slice(0, 2).map(item => `<div class="calendar-event" data-action="view-booking" data-id="${esc(item.id)}" title="${esc(item.title)} · ${esc(item.startTime)}">${esc(item.startTime)} ${esc(item.title)}</div>`).join("")}${items.length > 2 ? `<div class="calendar-event">+${items.length - 2} รายการ</div>` : ""}</div>`;
    }
    return `${heading("RESERVATION CALENDAR", "ปฏิทินการใช้ห้อง", "ภาพรวมการใช้ห้องที่อนุมัติแล้ว เลือกวันที่เพื่อดูรายการจอง")}
      <article class="card section-card calendar-panel"><div class="calendar-toolbar"><div class="calendar-nav"><button class="icon-action" data-action="calendar-prev" aria-label="เดือนก่อน">‹</button><button class="secondary-button button-small" data-action="calendar-today">วันนี้</button><button class="icon-action" data-action="calendar-next" aria-label="เดือนถัดไป">›</button></div><strong class="calendar-title">${monthNames[month]} ${year + 543}</strong><div class="calendar-legend"><span><i class="legend-dot"></i>อนุมัติแล้ว</span></div></div>
      <div class="calendar-grid">${weekNames.map(name => `<div class="calendar-weekday">${name}</div>`).join("")}${cells}</div><div class="section-caption" style="margin-top:12px">แสดงการจองที่อนุมัติแล้ว · คลิกที่รายการเพื่อดูรายละเอียด</div></article>`;
  }
  function approvalsPage() {
    const items = state.bookings.filter(item => approvalFilter === "all" ? item.status !== "cancelled" : item.status === approvalFilter).sort((a, b) => `${a.startDate}${a.startTime}`.localeCompare(`${b.startDate}${b.startTime}`));
    const staffNotice = staffMembersError ? `<div class="inline-note member-error">${esc(staffMembersError)} <button class="text-link" data-action="reload-staff-members">ลองโหลดรายชื่อเจ้าหน้าที่อีกครั้ง</button></div>` : "";
    return `${heading("APPROVAL WORKFLOW", "คิวอนุมัติการจอง", "ตรวจสอบคำขอ เลือกเจ้าหน้าที่ผู้รับงาน แล้วอนุมัติหรือแจ้งเหตุผลที่ไม่อนุมัติ")}
      <div class="approval-layout"><article class="card"><div class="section-card"><div class="section-title-row"><div><h2 class="section-title">คำขอจอง</h2><div class="section-caption">${items.length} รายการในคิว</div></div><select class="filter-select" id="approvalFilter"><option value="pending" ${approvalFilter === "pending" ? "selected" : ""}>รออนุมัติ</option><option value="all" ${approvalFilter === "all" ? "selected" : ""}>ทั้งหมด</option></select></div></div>
      ${staffNotice}
      <div class="queue-list">${items.length ? items.map(item => {
        const room = roomById(item.roomId);
        const assignedId = approvalAssignments[item.id] || item.assignedStaffId || "";
        const assignment = item.status === "pending"
          ? `<label class="approval-assignment"><span>เจ้าหน้าที่ผู้รับงาน</span><select class="filter-select" data-assignment-booking="${esc(item.id)}" ${!staffMembersLoaded || staffMembers.length === 0 ? "disabled" : ""}><option value="">${staffMembersLoading ? "กำลังโหลดรายชื่อ..." : staffMembers.length ? "เลือกเจ้าหน้าที่ก่อนอนุมัติ" : "ไม่มีเจ้าหน้าที่ที่เปิดใช้งาน"}</option>${staffMembers.map(staff => `<option value="${staff.id}" ${Number(assignedId) === staff.id ? "selected" : ""}>${esc(staff.name)}${staff.department ? ` · ${esc(staff.department)}` : ""}</option>`).join("")}</select></label>`
          : `<div class="assigned-staff"><span>เจ้าหน้าที่ผู้รับงาน</span><strong>${esc(item.assignedStaffName || "ไม่ได้ระบุ")}</strong></div>`;
        const canApprove = item.status === "pending" && staffMembersLoaded && staffMembers.some(staff => staff.id === Number(assignedId));
        return `<div class="queue-item"><div class="queue-date"><strong>${item.startDate.split("-")[2]}</strong><small>${monthNames[Number(item.startDate.split("-")[1]) - 1].slice(0, 3)}</small></div><div class="queue-info"><h3>${esc(item.title)}</h3><p>${esc(item.user)} · ${esc(item.department || "ไม่ระบุหน่วยงาน")} · ${esc(room?.name || "ไม่พบห้อง")}</p><div class="queue-meta"><span>▦ ${esc(fullDate(item.startDate))}${item.endDate !== item.startDate ? ` – ${esc(fullDate(item.endDate))}` : ""}</span><span>◷ ${item.startTime}–${item.endTime}</span><span>♧ ${item.attendees} คน</span>${item.signature ? "<span>✓ แนบลายเซ็น</span>" : ""}</div>${assignment}<div class="queue-actions"><button class="secondary-button button-small" data-action="view-booking" data-id="${esc(item.id)}">ตรวจสอบรายละเอียด</button>${item.status === "pending" ? `<button class="primary-button button-small" data-action="approve-booking" data-id="${esc(item.id)}" ${canApprove ? "" : "disabled"}>อนุมัติและส่งงาน</button><button class="danger-button button-small" data-action="reject-booking" data-id="${esc(item.id)}">ไม่อนุมัติ</button>` : badge(item)}</div></div></div>`;
      }).join("") : `<div class="empty-state"><div class="empty-icon">✓</div>ไม่มีคำขอในคิว</div>`}</div></article>
      <aside class="summary-column"><article class="card section-card"><div class="section-title-row"><h2 class="section-title">สรุปคิวงาน</h2></div><div class="summary-list"><div class="summary-row"><span>รออนุมัติ</span><strong>${state.bookings.filter(b => b.status === "pending").length}</strong></div><div class="summary-row"><span>อนุมัติแล้ว</span><strong>${state.bookings.filter(b => b.status === "approved").length}</strong></div><div class="summary-row"><span>ไม่อนุมัติ</span><strong>${state.bookings.filter(b => b.status === "rejected").length}</strong></div></div></article>
      <article class="card section-card" style="margin-top:12px"><div class="section-title-row"><h2 class="section-title">ขั้นตอนการดำเนินงาน</h2></div><div class="step-list"><div class="step-item"><span class="step-number">1</span><div class="step-copy"><strong>รับคำขอพร้อมลายเซ็น</strong><small>ตรวจสอบวัน เวลา ห้อง และวัตถุประสงค์</small></div></div><div class="step-item"><span class="step-number">2</span><div class="step-copy"><strong>เลือกเจ้าหน้าที่และอนุมัติ</strong><small>ระบบตรวจเวลาซ้ำและส่งงานให้เจ้าหน้าที่ที่เลือก</small></div></div><div class="step-item"><span class="step-number">3</span><div class="step-copy"><strong>เจ้าหน้าที่รับงาน</strong><small>เจ้าหน้าที่ที่ได้รับมอบหมายจัดเตรียมห้องประชุม</small></div></div></div></article></aside></div>`;
  }
  function staffPage() {
    const items = staffQueueItems();
    return `${heading("ROOM PREPARATION", "เตรียมห้องประชุม", "รับงานที่ผู้อนุมัติมอบหมาย กดรับงาน แล้วอัปเดตขั้นตอนการจัดเตรียมห้อง", '<button class="secondary-button" data-action="refresh-staff-queue">↻ โหลดงานล่าสุด</button>')}
      <div class="approval-layout"><article class="card"><div class="section-card"><div class="section-title-row"><div class="assigned-task-heading"><h2 class="section-title">งานที่ส่งต่อให้เจ้าหน้าที่</h2>${items.length ? `<span class="assigned-task-alert" aria-label="ได้รับมอบหมาย ${items.length} งาน">${items.length}</span>` : ""}<div class="section-caption">${items.length} รายการที่ได้รับมอบหมายและยังไม่เสร็จสิ้น</div></div></div></div>
      <div class="queue-list">${items.length ? items.map(item => {
        const room = roomById(item.roomId);
        const button = item.prepStatus === "waiting" ? `<button class="primary-button button-small" data-action="accept-prep" data-id="${esc(item.id)}">รับงาน</button>` : item.prepStatus === "accepted" ? `<button class="primary-button button-small" data-action="start-prep" data-id="${esc(item.id)}">เริ่มจัดเตรียม</button>` : `<button class="primary-button button-small" data-action="complete-prep" data-id="${esc(item.id)}">จัดเตรียมเสร็จ</button>`;
        const prepLabel = { waiting: "รอเจ้าหน้าที่รับงาน", accepted: "รับงานแล้ว", preparing: "กำลังจัดเตรียม" }[item.prepStatus] || "รอดำเนินการ";
        return `<div class="queue-item"><div class="queue-date"><strong>${item.startDate.split("-")[2]}</strong><small>${monthNames[Number(item.startDate.split("-")[1]) - 1].slice(0, 3)}</small></div><div class="queue-info"><h3>${esc(room?.name || "ไม่พบห้อง")} · ${esc(item.title)}</h3><p>${esc(item.user)} · ${esc(item.department || "ไม่ระบุหน่วยงาน")} · ${esc(item.note || "ไม่มีหมายเหตุเพิ่มเติม")}</p><div class="queue-meta"><span>▦ ${esc(fullDate(item.startDate))}</span><span>◷ ${item.startTime}–${item.endTime}</span><span>♧ ${item.attendees} คน</span><span>อุปกรณ์: ${esc(item.equipment?.join(", ") || "ไม่ระบุ")}</span><span>มอบหมายโดย: ${esc(item.approvedBy || "ผู้อนุมัติ")}</span></div><div class="queue-actions"><span class="status-badge status-staff">${prepLabel}</span>${button}<button class="secondary-button button-small" data-action="view-booking" data-id="${esc(item.id)}">รายละเอียด</button></div></div></div>`;
      }).join("") : `<div class="empty-state"><div class="empty-icon">✓</div>ยังไม่มีงานเตรียมห้อง</div>`}</div></article>
      <aside class="summary-column"><article class="card section-card"><h2 class="section-title">รายการเตรียมงาน</h2><div class="section-caption" style="margin:7px 0 13px">ตรวจสอบก่อนเวลาประชุม</div><div class="step-list"><div class="step-item"><span class="step-number">✓</span><div class="step-copy"><strong>ตรวจสอบกำหนดการ</strong><small>วันที่ เวลา และจำนวนผู้เข้าร่วม</small></div></div><div class="step-item"><span class="step-number">2</span><div class="step-copy"><strong>จัดห้องและอุปกรณ์</strong><small>จัดโต๊ะ เก้าอี้ และอุปกรณ์ที่ร้องขอ</small></div></div><div class="step-item"><span class="step-number">3</span><div class="step-copy"><strong>ยืนยันความพร้อม</strong><small>อัปเดตสถานะหลังเตรียมงานเสร็จ</small></div></div></div></article></aside></div>`;
  }
  function staffQueueItems() {
    return state.bookings
      .filter(item => item.status === "approved" && item.prepStatus !== "completed")
      .sort((a, b) => `${a.startDate}${a.startTime}`.localeCompare(`${b.startDate}${b.startTime}`));
  }
  function settingsPage() {
    const p = state.policy;
    return `${heading("SYSTEM SETTINGS", "กฎและการแจ้งเตือน", "กำหนดนโยบายการจอง การยกเลิกรายการ และช่องทางแจ้งเตือนของคณะ")}
      <div class="settings-grid"><article class="card section-card"><div class="section-title-row"><div><h2 class="section-title">นโยบายการจอง</h2><div class="section-caption">การเปลี่ยนแปลงจะมีผลกับคำขอใหม่ทันที</div></div></div>
      <form id="settingsForm"><div class="setting-block"><div class="setting-heading">ข้อกำหนดการจอง</div><div class="setting-row"><div><span>จองล่วงหน้าได้ไม่เกิน</span><small>จำนวนวันจากวันที่ทำรายการ</small></div><div><input class="form-control" type="number" name="maxDaysAhead" min="1" max="365" value="${p.maxDaysAhead}" required></div></div><div class="setting-row"><div><span>ระยะเวลาจองสูงสุดต่อวัน</span><small>การจองหลายวันใช้ช่วงเวลาเดียวกันในแต่ละวัน</small></div><div><input class="form-control" type="number" name="maxDurationHours" min="1" max="24" value="${p.maxDurationHours}" required></div></div><div class="setting-row"><div><span>บังคับแนบลายเซ็นผู้จอง</span><small>ลงชื่อบนแป้นหรือแนบไฟล์ภาพลายเซ็น</small></div><label class="switch"><input name="requireSignature" type="checkbox" ${p.requireSignature ? "checked" : ""}><span></span></label></div></div>
      <div class="setting-block"><div class="setting-heading">การแก้ไขและยกเลิก</div><div class="setting-row"><div><span>อนุญาตแก้ไขคำขอถึง</span><small>การแก้ไขคำขอที่รออนุมัติ</small></div><select class="form-control" name="editUntil"><option value="start" ${p.editUntil === "start" ? "selected" : ""}>ก่อนเวลาเริ่มจอง</option><option value="end" ${p.editUntil === "end" ? "selected" : ""}>ก่อนเวลาสิ้นสุด</option></select></div><div class="setting-row"><div><span>อนุญาตยกเลิกย้อนหลัง</span><small>รายการที่เวลาเริ่มต้นผ่านไปแล้ว</small></div><label class="switch"><input name="allowPastCancel" type="checkbox" ${p.allowPastCancel ? "checked" : ""}><span></span></label></div><div class="setting-row"><div><span>อนุญาตให้ผู้จองลบรายการ</span><small>ลบได้เฉพาะสถานะที่เลือกด้านล่าง</small></div><label class="switch"><input name="allowDelete" type="checkbox" ${p.allowDelete ? "checked" : ""}><span></span></label></div><div class="check-list">${[["rejected", "ไม่อนุมัติ"], ["cancelled", "ยกเลิกแล้ว"]].map(([value, label]) => `<label class="checkbox-row"><input type="checkbox" name="deletableStatuses" value="${value}" ${(p.deletableStatuses || []).includes(value) ? "checked" : ""}>ลบรายการสถานะ${label}</label>`).join("")}</div></div>
      <div class="setting-block"><div class="setting-heading">ช่องทางแจ้งเตือน</div><div class="setting-row"><div><span>แจ้งเตือนทางอีเมล</span><small>ส่งคำขอ สถานะอนุมัติ และเหตุผลที่ไม่อนุมัติ</small></div><label class="switch"><input name="notifyEmail" type="checkbox" ${p.notifyEmail ? "checked" : ""}><span></span></label></div><div class="setting-row"><div><span>แจ้งเตือนผ่าน LINE</span><small>ต้องเชื่อมต่อ LINE Messaging API ก่อนใช้งานจริง</small></div><label class="switch"><input name="notifyLine" type="checkbox" ${p.notifyLine ? "checked" : ""}><span></span></label></div></div>
      <div class="modal-actions"><button class="primary-button" type="submit">บันทึกการตั้งค่า</button></div></form></article>
      <aside><article class="card section-card"><div class="section-title-row"><div><h2 class="section-title">การแจ้งเตือนในระบบ</h2><div class="section-caption">บันทึกกิจกรรมล่าสุด</div></div><button class="text-link" data-action="notifications">ดูทั้งหมด</button></div><div class="schedule-list">${state.notifications.slice(0, 4).map(item => `<div class="schedule-item"><span class="room-thumb-mini">♧</span><div class="schedule-copy"><strong>${esc(item.title)}</strong><small>${esc(item.text)}</small><small>${timestamp(item.time)}</small></div></div>`).join("") || `<div class="empty-state">ยังไม่มีการแจ้งเตือน</div>`}</div></article><article class="card section-card" style="margin-top:12px"><div class="section-title-row"><h2 class="section-title">หมายเหตุระบบ</h2></div><div class="inline-note">อีเมลและ LINE เป็นช่องทางที่ตั้งค่าได้ในต้นแบบนี้ การส่งจริงต้องเชื่อมต่อเซิร์ฟเวอร์ SMTP และ LINE Messaging API ของมหาวิทยาลัย</div></article></aside></div>`;
  }
  function membersPage() {
    if (!can("manage-members")) {
      if (!can("create-member")) return "";
      return `${heading("MEMBER MANAGEMENT", "จัดการสมาชิกทั้งหมด", "เพิ่มบัญชีผู้ใช้งานและกำหนดบทบาทสำหรับการใช้งานระบบ", pageButton("เพิ่มสมาชิก", "create-member"))}
        <article class="card section-card member-create-card"><div class="section-title-row"><div><h2 class="section-title">เพิ่มบัญชีสมาชิก</h2><div class="section-caption">Admin สามารถสร้างบัญชี User, Staff หรือ Admin ได้</div></div></div><div class="inline-note">หน้านี้ใช้สำหรับสร้างบัญชีใหม่เท่านั้น ไม่แสดงหรือแก้ไขข้อมูลสมาชิกเดิม และไม่สามารถสร้างบัญชี Super Admin ได้</div><button class="primary-button" data-action="create-member"><span class="button-icon">＋</span>เพิ่มสมาชิกใหม่</button></article>`;
    }
    const addMemberButton = pageButton("เพิ่มสมาชิก", "create-member");
    if (membersLoading && !membersLoaded) {
      return `${heading("MEMBER MANAGEMENT", "จัดการสมาชิกทั้งหมด", "จัดการบัญชี บทบาท และสถานะการใช้งานของสมาชิก", addMemberButton)}<article class="card empty-state">กำลังโหลดข้อมูลสมาชิก…</article>`;
    }
    if (membersLoadError) {
      return `${heading("MEMBER MANAGEMENT", "จัดการสมาชิกทั้งหมด", "จัดการบัญชี บทบาท และสถานะการใช้งานของสมาชิก", addMemberButton)}<article class="card empty-state">${esc(membersLoadError)} <button class="secondary-button button-small" data-action="reload-members">ลองอีกครั้ง</button></article>`;
    }
    const query = memberSearch.trim().toLowerCase();
    const filtered = members.filter(member => {
      const matchesSearch = `${member.namePrefix} ${member.name} ${memberTypes[member.memberType] || ""} ${member.email} ${member.department} ${member.phone}`.toLowerCase().includes(query);
      return matchesSearch && (memberRoleFilter === "all" || member.role === memberRoleFilter);
    });
    const activeCount = members.filter(member => member.active).length;
    const rows = filtered.map(member => {
      const isSelf = Number(member.id) === Number(authSession.id);
      const displayName = `${member.namePrefix ? `${member.namePrefix} ` : ""}${member.name}`;
      return `<tr>
        <td><span class="table-primary">${esc(displayName)}</span><span class="table-secondary">${esc(member.email)}</span></td>
        <td>${esc(member.department || "—")}<span class="table-secondary">${esc(member.phone || "—")}</span></td>
        <td>${esc(memberTypes[member.memberType] || "—")}</td>
        <td><select class="filter-select member-role-select" data-member-role="${member.id}" aria-label="บทบาทของ ${esc(member.name)}" ${isSelf ? "disabled" : ""}>${Object.entries(memberRoleLabels).map(([role, label]) => `<option value="${role}" ${member.role === role ? "selected" : ""}>${label}</option>`).join("")}</select></td>
        <td><span class="status-badge ${member.active ? "status-approved" : "status-completed"}">${member.active ? "เปิดใช้งาน" : "ปิดใช้งาน"}</span></td>
        <td>${timestamp(member.created_at)}</td>
        <td><div class="table-actions"><button class="secondary-button button-small" data-action="edit-member" data-id="${member.id}" ${isSelf ? "disabled" : ""}>แก้ไขข้อมูล</button><button class="secondary-button button-small" data-action="save-member-role" data-id="${member.id}" ${isSelf ? "disabled" : ""}>บันทึกบทบาท</button><button class="${member.active ? "danger-button" : "primary-button"} button-small" data-action="toggle-member" data-id="${member.id}" data-active="${member.active ? "false" : "true"}" ${isSelf ? "disabled" : ""}>${member.active ? "ปิดบัญชี" : "เปิดบัญชี"}</button></div></td>
      </tr>`;
    });
    return `${heading("MEMBER MANAGEMENT", "จัดการสมาชิกทั้งหมด", "แก้ไขข้อมูลบัญชีและรหัสผ่านสมาชิก พร้อมกำหนดบทบาทและสถานะ", addMemberButton)}
      <section class="stat-grid member-stats">
        <article class="stat-card"><div><div class="stat-label">สมาชิกทั้งหมด</div><div class="stat-value">${members.length}</div><div class="stat-note">บัญชีในระบบ</div></div><span class="stat-icon icon-blue">♙</span></article>
        <article class="stat-card"><div><div class="stat-label">บัญชีที่เปิดใช้งาน</div><div class="stat-value">${activeCount}</div><div class="stat-note">เข้าใช้งานระบบได้</div></div><span class="stat-icon icon-green">✓</span></article>
        <article class="stat-card"><div><div class="stat-label">บัญชีที่ปิดใช้งาน</div><div class="stat-value">${members.length - activeCount}</div><div class="stat-note">ระงับการเข้าสู่ระบบ</div></div><span class="stat-icon icon-orange">Ⅱ</span></article>
      </section>
      <div class="toolbar member-toolbar"><div class="search-box"><input id="memberSearch" type="search" placeholder="ค้นหาชื่อ อีเมล หน่วยงาน หรือเบอร์โทร..." value="${esc(memberSearch)}"></div><select id="memberRoleFilter" class="filter-select"><option value="all" ${memberRoleFilter === "all" ? "selected" : ""}>ทุกบทบาท</option>${Object.entries(memberRoleLabels).map(([role, label]) => `<option value="${role}" ${memberRoleFilter === role ? "selected" : ""}>${label}</option>`).join("")}</select><span class="section-caption">${filtered.length} จาก ${members.length} บัญชี</span></div>
      <article class="card table-card"><div class="table-wrap"><table class="data-table member-table"><thead><tr><th>ชื่อ / อีเมล</th><th>หน่วยงาน / โทรศัพท์</th><th>สถานะสมาชิก</th><th>บทบาท</th><th>สถานะบัญชี</th><th>วันที่สมัคร</th><th>จัดการ</th></tr></thead><tbody>${rows.length ? rows.join("") : `<tr><td colspan="7"><div class="empty-state">${members.length ? "ไม่พบสมาชิกตามเงื่อนไข" : "ยังไม่มีบัญชีสมาชิกในระบบ"}</div></td></tr>`}</tbody></table></div><div class="pagination"><span>ระบบจะแสดงบัญชีทั้งหมดให้เฉพาะ Super Admin</span><span>ข้อมูลบัญชีของตนเองแก้ไขได้จากเมนูโปรไฟล์</span></div></article>`;
  }
  function statisticsPage() {
    if (authSession?.role !== "super_admin") return "";
    const reportMonth = /^\d{4}-\d{2}$/.test(statisticsMonth) ? statisticsMonth : isoDate(today).slice(0, 7);
    const memberStats = statisticsData?.month === reportMonth ? statisticsData.members : null;
    const [year, month] = reportMonth.split("-").map(Number);
    const monthStart = `${reportMonth}-01`;
    const monthEnd = isoDate(new Date(year, month, 0));
    const monthTitle = `${monthNames[month - 1]} ${year + 543}`;
    const actionButtons = `<div class="statistics-actions"><button class="secondary-button" type="button" data-action="export-statistics-csv">ส่งออก CSV</button><button class="primary-button" type="button" data-action="print-statistics">พิมพ์ / บันทึก PDF</button></div>`;
    if (statisticsLoading && !memberStats) {
      return `${heading("SYSTEM REPORT", "สรุปสถิติการใช้งานระบบ", "รายงานการจอง การใช้ห้อง และสมาชิกใหม่รายเดือน") }<article class="card empty-state">กำลังโหลดข้อมูลสถิติ…</article>`;
    }
    if (statisticsLoadError && !memberStats) {
      return `${heading("SYSTEM REPORT", "สรุปสถิติการใช้งานระบบ", "รายงานการจอง การใช้ห้อง และสมาชิกใหม่รายเดือน") }<article class="card empty-state">${esc(statisticsLoadError)} <button class="secondary-button button-small" data-action="reload-statistics">ลองอีกครั้ง</button></article>`;
    }
    const monthBookings = state.bookings.filter(item =>
      /^\d{4}-\d{2}-\d{2}$/.test(item.startDate || "") &&
      /^\d{4}-\d{2}-\d{2}$/.test(item.endDate || "") &&
      item.startDate <= monthEnd && item.endDate >= monthStart
    );
    const countByStatus = status => monthBookings.filter(item => item.status === status).length;
    const confirmed = monthBookings.filter(item => ["approved", "completed"].includes(item.status));
    const hoursInMonth = booking => {
      const startDate = booking.startDate > monthStart ? booking.startDate : monthStart;
      const endDate = booking.endDate < monthEnd ? booking.endDate : monthEnd;
      const days = Math.floor((Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / 86400000) + 1;
      const [startHour, startMinute] = (booking.startTime || "").split(":").map(Number);
      const [endHour, endMinute] = (booking.endTime || "").split(":").map(Number);
      const duration = ((endHour * 60 + endMinute) - (startHour * 60 + startMinute)) / 60;
      return Number.isFinite(days) && days > 0 && Number.isFinite(duration) && duration > 0 ? days * duration : 0;
    };
    const totalUsageHours = confirmed.reduce((sum, booking) => sum + hoursInMonth(booking), 0);
    const totalUsageDays = confirmed.reduce((sum, booking) => {
      const startDate = booking.startDate > monthStart ? booking.startDate : monthStart;
      const endDate = booking.endDate < monthEnd ? booking.endDate : monthEnd;
      return sum + Math.floor((Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / 86400000) + 1;
    }, 0);
    const newMemberCount = memberStats?.new_members || 0;
    const statusRows = [
      ["รออนุมัติ", countByStatus("pending"), "status-pending"],
      ["อนุมัติแล้ว", countByStatus("approved") + countByStatus("completed"), "status-approved"],
      ["ไม่อนุมัติ", countByStatus("rejected"), "status-rejected"],
      ["ยกเลิก", countByStatus("cancelled"), "status-completed"]
    ];
    const statusMax = Math.max(1, ...statusRows.map(([, count]) => count));
    const roomStats = state.rooms.map(room => {
      const bookings = monthBookings.filter(item => item.roomId === room.id);
      const roomConfirmed = bookings.filter(item => ["approved", "completed"].includes(item.status));
      return {
        room,
        bookings,
        requestCount: bookings.length,
        approvedCount: roomConfirmed.length,
        usageDays: roomConfirmed.reduce((sum, item) => {
          const startDate = item.startDate > monthStart ? item.startDate : monthStart;
          const endDate = item.endDate < monthEnd ? item.endDate : monthEnd;
          return sum + Math.floor((Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / 86400000) + 1;
        }, 0),
        usageHours: roomConfirmed.reduce((sum, item) => sum + hoursInMonth(item), 0)
      };
    }).sort((a, b) => b.usageHours - a.usageHours || a.room.name.localeCompare(b.room.name, "th"));
    const maxRoomHours = Math.max(1, ...roomStats.map(item => item.usageHours));
    const bookingRows = monthBookings.slice().sort((a, b) =>
      `${a.startDate}${a.startTime}`.localeCompare(`${b.startDate}${b.startTime}`)
    ).map(item => {
      const room = roomById(item.roomId);
      return `<tr><td>${esc(item.title || "—")}<span class="table-secondary">${esc(item.user || "—")}</span></td>
        <td>${esc(room?.name || "ไม่พบห้อง")}</td><td class="date-cell">${shortDate(item.startDate)}${item.endDate !== item.startDate ? ` – ${shortDate(item.endDate)}` : ""}</td>
        <td class="date-cell">${esc(item.startTime || "—")}–${esc(item.endTime || "—")}</td><td>${esc(statusInfo(item)[0])}</td></tr>`;
    });
    return `${heading("SYSTEM REPORT", "สรุปสถิติการใช้งานระบบ", "รายงานการจอง การใช้ห้อง และสมาชิกใหม่รายเดือน", actionButtons)}
      <div class="toolbar statistics-toolbar"><label for="statisticsMonth">เลือกเดือน</label><input class="filter-select" id="statisticsMonth" type="month" value="${esc(reportMonth)}"><span class="section-caption">นับรายการจองที่มีวันใช้งานทับซ้อนกับเดือนที่เลือก</span></div>
      <section class="stat-grid statistics-kpis">
        <article class="stat-card"><div><div class="stat-label">คำขอจองในเดือน</div><div class="stat-value">${monthBookings.length}</div><div class="stat-note">รายการที่มีวันใช้งานใน ${monthTitle}</div></div><span class="stat-icon icon-blue">▤</span></article>
        <article class="stat-card"><div><div class="stat-label">จองที่อนุมัติ</div><div class="stat-value">${confirmed.length}</div><div class="stat-note">รวมการจองที่เตรียมเสร็จแล้ว</div></div><span class="stat-icon icon-green">✓</span></article>
        <article class="stat-card"><div><div class="stat-label">ชั่วโมงใช้ห้องที่อนุมัติ</div><div class="stat-value">${Number(totalUsageHours.toFixed(1))}</div><div class="stat-note">${totalUsageDays} วัน-ห้องในเดือนที่เลือก</div></div><span class="stat-icon icon-purple">◷</span></article>
        <article class="stat-card"><div><div class="stat-label">สมาชิกสมัครใหม่</div><div class="stat-value">${newMemberCount}</div><div class="stat-note">สมาชิกใหม่ใน ${monthTitle}</div></div><span class="stat-icon icon-orange">♙</span></article>
      </section>
      <section class="statistics-grid">
        <article class="card section-card"><div class="section-title-row"><div><h2 class="section-title">สถานะคำขอจอง</h2><div class="section-caption">รายการที่มีวันใช้งานทับซ้อนกับเดือนที่เลือก</div></div></div>
          <div class="statistics-bars">${statusRows.map(([label, count, style]) => `<div class="statistics-bar-row"><span>${label}</span><div class="statistics-bar-track"><i class="${style}" style="width:${count ? Math.max(5, count / statusMax * 100) : 0}%"></i></div><strong>${count}</strong></div>`).join("")}</div>
        </article>
        <article class="card section-card"><div class="section-title-row"><div><h2 class="section-title">บัญชีสมาชิกในระบบ</h2><div class="section-caption">ข้อมูลสมาชิกปัจจุบัน</div></div></div>
          <div class="statistics-member-summary"><strong>${memberStats?.total || 0}</strong><span>สมาชิกทั้งหมด</span><strong>${memberStats?.active || 0}</strong><span>บัญชีเปิดใช้งาน</span><strong>${memberStats?.user_count || 0}</strong><span>User</span><strong>${memberStats?.admin_count || 0}</strong><span>Admin</span><strong>${memberStats?.staff_count || 0}</strong><span>Staff</span><strong>${memberStats?.super_admin_count || 0}</strong><span>Super Admin</span></div>
        </article>
      </section>
      <article class="card section-card statistics-room-card"><div class="section-title-row"><div><h2 class="section-title">การใช้ห้องประชุม</h2><div class="section-caption">ชั่วโมงใช้งานคำนวณจากรายการที่อนุมัติแล้ว และคิดช่วงเวลาเดิมในแต่ละวันของการจองหลายวัน</div></div></div>
        <div class="table-wrap"><table class="data-table statistics-room-table"><thead><tr><th>ห้องประชุม</th><th>คำขอ</th><th>อนุมัติ</th><th>วัน-ห้อง</th><th>ชั่วโมงใช้งาน</th><th>สัดส่วนชั่วโมง</th></tr></thead><tbody>${roomStats.map(item => `<tr><td><span class="table-primary">${esc(item.room.name)}</span><span class="table-secondary">${esc(item.room.number || "")}</span></td><td>${item.requestCount}</td><td>${item.approvedCount}</td><td>${item.usageDays}</td><td>${Number(item.usageHours.toFixed(1))}</td><td><div class="statistics-bar-track"><i class="status-approved" style="width:${item.usageHours ? Math.max(3, item.usageHours / maxRoomHours * 100) : 0}%"></i></div></td></tr>`).join("") || `<tr><td colspan="6" class="empty-state">ยังไม่มีข้อมูลห้องประชุม</td></tr>`}</tbody></table></div>
      </article>
      <article class="card table-card statistics-bookings-card"><div class="section-title-row"><div><h2 class="section-title">รายการจองประจำ${monthTitle}</h2><div class="section-caption">${monthBookings.length} รายการที่มีวันใช้งานในเดือนนี้ · รายการหลายวันนับเป็นหนึ่งคำขอ</div></div></div>
        <div class="table-wrap"><table class="data-table"><thead><tr><th>หัวข้อ / ผู้จอง</th><th>ห้อง</th><th>วันใช้งาน</th><th>เวลา</th><th>สถานะ</th></tr></thead><tbody>${bookingRows.length ? bookingRows.join("") : `<tr><td colspan="5"><div class="empty-state">ไม่มีรายการจองในเดือนที่เลือก</div></td></tr>`}</tbody></table></div>
      </article>`;
  }
  function downloadStatisticsCsv() {
    if (authSession?.role !== "super_admin") {
      toast("เฉพาะ Super Admin เท่านั้นที่ส่งออกรายงานได้", true);
      return;
    }
    const reportMonth = /^\d{4}-\d{2}$/.test(statisticsMonth) ? statisticsMonth : isoDate(today).slice(0, 7);
    if (statisticsData?.month !== reportMonth) {
      toast("ข้อมูลสมาชิกของรายงานยังไม่พร้อม กรุณาลองโหลดใหม่ก่อนส่งออก", true);
      return;
    }
    const [year, month] = reportMonth.split("-").map(Number);
    const monthStart = `${reportMonth}-01`;
    const monthEnd = isoDate(new Date(year, month, 0));
    const monthTitle = `${monthNames[month - 1]} ${year + 543}`;
    const monthBookings = state.bookings.filter(item =>
      /^\d{4}-\d{2}-\d{2}$/.test(item.startDate || "") &&
      /^\d{4}-\d{2}-\d{2}$/.test(item.endDate || "") &&
      item.startDate <= monthEnd && item.endDate >= monthStart
    );
    const hoursInMonth = booking => {
      const startDate = booking.startDate > monthStart ? booking.startDate : monthStart;
      const endDate = booking.endDate < monthEnd ? booking.endDate : monthEnd;
      const days = Math.floor((Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / 86400000) + 1;
      const [startHour, startMinute] = (booking.startTime || "").split(":").map(Number);
      const [endHour, endMinute] = (booking.endTime || "").split(":").map(Number);
      const duration = ((endHour * 60 + endMinute) - (startHour * 60 + startMinute)) / 60;
      return Number.isFinite(days) && days > 0 && Number.isFinite(duration) && duration > 0 ? days * duration : 0;
    };
    const statuses = [["รออนุมัติ", ["pending"]], ["อนุมัติแล้ว", ["approved", "completed"]], ["ไม่อนุมัติ", ["rejected"]], ["ยกเลิก", ["cancelled"]]];
    const rows = [
      ["รายงานสถิติ EduRoom", monthTitle],
      ["ข้อมูลสรุป", "จำนวน", "หน่วย"],
      ["คำขอจองในเดือน", monthBookings.length, "รายการ"],
      ...statuses.map(([label, statusList]) => [label, monthBookings.filter(item => statusList.includes(item.status)).length, "รายการ"]),
      ["สมาชิกสมัครใหม่", statisticsData.members.new_members, "บัญชี"],
      ["สมาชิกทั้งหมด", statisticsData.members.total, "บัญชี"],
      ["บัญชีเปิดใช้งาน", statisticsData.members.active, "บัญชี"],
      [],
      ["สถิติการใช้ห้อง", "คำขอ", "อนุมัติ", "วัน-ห้อง", "ชั่วโมง"],
      ...state.rooms.map(room => {
        const bookings = monthBookings.filter(item => item.roomId === room.id);
        const confirmed = bookings.filter(item => ["approved", "completed"].includes(item.status));
        const usageDays = confirmed.reduce((sum, item) => {
          const startDate = item.startDate > monthStart ? item.startDate : monthStart;
          const endDate = item.endDate < monthEnd ? item.endDate : monthEnd;
          return sum + Math.floor((Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / 86400000) + 1;
        }, 0);
        return [room.name, bookings.length, confirmed.length, usageDays, Number(confirmed.reduce((sum, item) => sum + hoursInMonth(item), 0).toFixed(1))];
      }),
      [],
      ["รายการจอง", "ผู้จอง", "ห้อง", "วันที่เริ่ม", "วันที่สิ้นสุด", "เวลาเริ่ม", "เวลาสิ้นสุด", "สถานะ", "จำนวนผู้เข้าร่วม"],
      ...monthBookings.map(item => [
        item.title || "",
        item.user || "",
        roomById(item.roomId)?.name || "ไม่พบห้อง",
        item.startDate || "",
        item.endDate || "",
        item.startTime || "",
        item.endTime || "",
        statusInfo(item)[0],
        item.attendees || 0
      ])
    ];
    const csv = rows.map(row => row.map(value => {
      let text = String(value ?? "");
      if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
      return `"${text.replace(/"/g, '""')}"`;
    }).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `EduRoom-statistics-${reportMonth}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function render() {
    const pages = { dashboard: dashboardPage, rooms: () => roomsPage(false), manage: () => roomsPage(true), bookings: bookingsPage, calendar: calendarPage, approvals: approvalsPage, staff: staffPage, settings: settingsPage, members: membersPage, statistics: statisticsPage };
    if (!canAccessPage(currentPage)) currentPage = "dashboard";
    updateNavigationPermissions();
    $("#pageContent").innerHTML = (pages[currentPage] || dashboardPage)();
    document.querySelectorAll(".nav-link").forEach(link => link.classList.toggle("active", link.dataset.page === currentPage));
    $("#myBookingCount").textContent = state.bookings.filter(item => isBookingOwner(item) && item.status !== "cancelled").length;
    $("#approvalCount").textContent = state.bookings.filter(item => item.status === "pending").length;
    const staffTaskCount = can("prepare-rooms") ? staffQueueItems().length : 0;
    const staffTaskBadge = $("#staffTaskCount");
    staffTaskBadge.textContent = staffTaskCount > 99 ? "99+" : String(staffTaskCount);
    staffTaskBadge.hidden = staffTaskCount === 0;
    bindPageEvents();
    if (currentPage === "members" && can("manage-members") && !membersLoaded && !membersLoading && !membersLoadError) loadMembers();
    if (currentPage === "statistics" && authSession?.role === "super_admin" && !statisticsLoading && statisticsData?.month !== statisticsMonth && !statisticsLoadError) loadStatistics();
    if (currentPage === "approvals" && can("approve-booking") && !staffMembersLoaded && !staffMembersLoading && !staffMembersError) loadStaffMembers();
    if (currentPage === "staff" && Date.now() - staffStateRefreshAt > 15000) refreshStaffQueue(false);
  }
  function bindPageEvents() {
    const search = $("#roomSearch");
    if (search) search.addEventListener("input", event => {
      roomSearch = event.target.value;
      const pos = event.target.selectionStart;
      render();
      const next = $("#roomSearch");
      if (next) { next.focus(); next.setSelectionRange(pos, pos); }
    });
    const roomSelect = $("#roomFilter");
    if (roomSelect) roomSelect.addEventListener("change", event => { roomFilter = event.target.value; render(); });
    const bookingSelect = $("#bookingFilter");
    if (bookingSelect) bookingSelect.addEventListener("change", event => { bookingFilter = event.target.value; render(); });
    const approvalSelect = $("#approvalFilter");
    if (approvalSelect) approvalSelect.addEventListener("change", event => { approvalFilter = event.target.value; render(); });
    const statisticsMonthInput = $("#statisticsMonth");
    if (statisticsMonthInput) statisticsMonthInput.addEventListener("change", event => {
      if (/^\d{4}-\d{2}$/.test(event.target.value)) {
        statisticsMonth = event.target.value;
        statisticsData = null;
        statisticsLoadError = "";
        render();
      }
    });
    document.querySelectorAll("[data-assignment-booking]").forEach(select => select.addEventListener("change", () => {
      approvalAssignments[select.dataset.assignmentBooking] = select.value;
      const approveButton = document.querySelector(`[data-action="approve-booking"][data-id="${select.dataset.assignmentBooking}"]`);
      if (approveButton) approveButton.disabled = !select.value;
    }));
    const settingsForm = $("#settingsForm");
    if (settingsForm) settingsForm.addEventListener("submit", saveSettings);
    const searchMembers = $("#memberSearch");
    if (searchMembers) searchMembers.addEventListener("input", event => {
      memberSearch = event.target.value;
      const position = event.target.selectionStart;
      render();
      const next = $("#memberSearch");
      if (next) { next.focus(); next.setSelectionRange(position, position); }
    });
    const roleFilter = $("#memberRoleFilter");
    if (roleFilter) roleFilter.addEventListener("change", event => { memberRoleFilter = event.target.value; render(); });
    document.querySelectorAll("[data-member-role]").forEach(select => select.addEventListener("change", () => {
      const saveButton = document.querySelector(`[data-action="save-member-role"][data-id="${select.dataset.memberRole}"]`);
      if (saveButton) saveButton.classList.add("member-role-dirty");
    }));
  }
  function openModal(title, subtitle, content, { wide = false } = {}) {
    const panel = $("#modalPanel");
    panel.classList.toggle("modal-wide", wide);
    panel.innerHTML = `<div class="modal-header"><div><h2 id="modalTitle">${title}</h2>${subtitle ? `<p>${subtitle}</p>` : ""}</div><button class="modal-close" data-action="close-modal" aria-label="ปิด">×</button></div>${content}`;
    panel.querySelectorAll("[data-assignment-booking]").forEach(select => select.addEventListener("change", () => {
      approvalAssignments[select.dataset.assignmentBooking] = select.value;
      const approveButton = panel.querySelector(`[data-action="approve-booking"][data-id="${select.dataset.assignmentBooking}"]`);
      if (approveButton) approveButton.disabled = !select.value;
    }));
    $("#modalBackdrop").hidden = false;
    document.body.style.overflow = "hidden";
  }
  function closeModal() {
    $("#modalBackdrop").hidden = true;
    document.body.style.overflow = "";
  }
  function openProfileForm() {
    if (!can("manage-members")) { toast("เฉพาะ Super Admin เท่านั้นที่แก้ไขข้อมูลบัญชีได้", true); return; }
    const account = authSession;
    openModal("แก้ไขข้อมูลส่วนตัว", "เปลี่ยนชื่อ อีเมลเข้าสู่ระบบ หน่วยงาน หรือรหัสผ่านของคุณ", `<form id="profileForm">
      <div class="form-grid">
        ${profileImageField("profileImageFile", false, account.profileImage || "")}
        <div class="form-field"><label for="profileNamePrefix">คำนำหน้า<span class="required">*</span></label><select class="form-control" id="profileNamePrefix" name="namePrefix" required>${prefixOptions(account.namePrefix || "")}</select></div>
        <div class="form-field"><label for="profileName">ชื่อ–นามสกุล<span class="required">*</span></label><input class="form-control" id="profileName" name="name" maxlength="100" required value="${esc(account.name)}"></div>
        <div class="form-field"><label for="profileMemberType">สถานะสมาชิก<span class="required">*</span></label><select class="form-control" id="profileMemberType" name="memberType" required>${memberTypeOptions(account.memberType || "")}</select></div>
        <div class="form-field"><label for="profileEmail">อีเมล / ชื่อผู้ใช้<span class="required">*</span></label><input class="form-control" id="profileEmail" name="email" type="email" maxlength="254" required value="${esc(account.email)}"></div>
        <div class="form-field"><label for="profileDepartment">หน่วยงาน / สาขาวิชา</label><input class="form-control" id="profileDepartment" name="department" maxlength="100" value="${esc(account.department || "")}"></div>
        <div class="form-field"><label for="profilePhone">เบอร์โทรศัพท์</label><input class="form-control" id="profilePhone" name="phone" type="tel" maxlength="20" value="${esc(account.phone || "")}"></div>
        <div class="form-field full"><label for="profileCurrentPassword">รหัสผ่านปัจจุบัน<span class="required">*</span></label><input class="form-control" id="profileCurrentPassword" name="currentPassword" type="password" autocomplete="current-password" required></div>
        <div class="form-field"><label for="profileNewPassword">รหัสผ่านใหม่</label><input class="form-control" id="profileNewPassword" name="newPassword" type="password" minlength="8" maxlength="72" autocomplete="new-password"><span class="field-hint">เว้นว่างไว้หากไม่ต้องการเปลี่ยน</span></div>
        <div class="form-field"><label for="profileConfirmPassword">ยืนยันรหัสผ่านใหม่</label><input class="form-control" id="profileConfirmPassword" name="confirmPassword" type="password" minlength="8" maxlength="72" autocomplete="new-password"></div>
      </div>
      <div class="inline-note">ต้องใช้อีเมลมหาวิทยาลัย @crru.ac.th และกรอกรหัสผ่านปัจจุบันเพื่อยืนยันการเปลี่ยนแปลง</div>
      <div class="modal-actions"><button class="secondary-button" type="button" data-action="close-modal">ยกเลิก</button><button class="primary-button" type="submit">บันทึกข้อมูล</button></div>
    </form>`, { wide: true });
    $("#profileForm").addEventListener("submit", saveOwnProfile);
    bindProfileImagePreview($("#profileForm"));
  }
  async function saveOwnProfile(event) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const newPassword = String(values.newPassword || "");
    if (newPassword !== String(values.confirmPassword || "")) { toast("รหัสผ่านใหม่และการยืนยันไม่ตรงกัน", true); return; }
    if (newPassword && (newPassword.length < 8 || new TextEncoder().encode(newPassword).length > 72)) { toast("รหัสผ่านใหม่ต้องมีความยาว 8–72 ไบต์", true); return; }
    try {
      const profileImage = await selectedProfileImage(event.currentTarget, authSession.profileImage || "");
      const result = await api("profile-update", {
        namePrefix: String(values.namePrefix || ""),
        name: String(values.name).trim(),
        memberType: String(values.memberType || ""),
        email: String(values.email).trim().toLowerCase(),
        department: String(values.department || "").trim(),
        phone: String(values.phone || "").trim(),
        profileImage,
        currentPassword: String(values.currentPassword),
        newPassword
      });
      authSession = result.user;
      updateProfile();
      closeModal();
      toast("บันทึกข้อมูลส่วนตัวแล้ว");
      try {
        const latest = await api("state");
        stateVersion = latest.version;
        state = mergeServerState(latest.state);
        render();
      } catch (error) {
        toast(`อัปเดตข้อมูลแล้ว แต่โหลดรายการจองล่าสุดไม่สำเร็จ: ${error.message}`, true);
      }
    } catch (error) {
      toast(`บันทึกข้อมูลส่วนตัวไม่สำเร็จ: ${error.message}`, true);
    }
  }
  function openMemberForm(id) {
    if (!can("manage-members")) { toast("เฉพาะ Super Admin เท่านั้นที่จัดการสมาชิกได้", true); return; }
    const member = members.find(item => String(item.id) === String(id));
    if (!member || Number(id) === Number(authSession?.id)) { toast("บัญชีของตนเองให้แก้ไขจากเมนูโปรไฟล์", true); return; }
    openModal("แก้ไขข้อมูลสมาชิก", "เปลี่ยนข้อมูลบัญชีและกำหนดรหัสผ่านใหม่ได้ บทบาทและสถานะจัดการจากตารางสมาชิก", `<form id="memberProfileForm" data-member-id="${member.id}">
      <div class="form-grid">
        ${profileImageField("memberProfileImage", false, member.profileImage || "")}
        <div class="form-field"><label for="memberNamePrefix">คำนำหน้า<span class="required">*</span></label><select class="form-control" id="memberNamePrefix" name="namePrefix" required>${prefixOptions(member.namePrefix || "")}</select></div>
        <div class="form-field"><label for="memberName">ชื่อ–นามสกุล<span class="required">*</span></label><input class="form-control" id="memberName" name="name" maxlength="100" required value="${esc(member.name)}"></div>
        <div class="form-field"><label for="memberMemberType">สถานะสมาชิก<span class="required">*</span></label><select class="form-control" id="memberMemberType" name="memberType" required>${memberTypeOptions(member.memberType || "")}</select></div>
        <div class="form-field"><label for="memberEmail">อีเมล / ชื่อผู้ใช้<span class="required">*</span></label><input class="form-control" id="memberEmail" name="email" type="email" maxlength="254" required value="${esc(member.email)}"></div>
        <div class="form-field"><label for="memberDepartment">หน่วยงาน / สาขาวิชา</label><input class="form-control" id="memberDepartment" name="department" maxlength="100" value="${esc(member.department || "")}"></div>
        <div class="form-field"><label for="memberPhone">เบอร์โทรศัพท์</label><input class="form-control" id="memberPhone" name="phone" type="tel" maxlength="20" value="${esc(member.phone || "")}"></div>
        <div class="form-field"><label for="memberNewPassword">กำหนดรหัสผ่านใหม่</label><input class="form-control" id="memberNewPassword" name="newPassword" type="password" minlength="8" maxlength="72" autocomplete="new-password"><span class="field-hint">เว้นว่างไว้หากไม่ต้องการรีเซ็ตรหัสผ่าน</span></div>
        <div class="form-field"><label for="memberConfirmPassword">ยืนยันรหัสผ่านใหม่</label><input class="form-control" id="memberConfirmPassword" name="confirmPassword" type="password" minlength="8" maxlength="72" autocomplete="new-password"></div>
      </div>
      <div class="inline-note">การเปลี่ยนอีเมลจะเปลี่ยนชื่อผู้ใช้ที่สมาชิกใช้เข้าสู่ระบบ อีเมลใหม่ต้องลงท้ายด้วย @crru.ac.th</div>
      <div class="modal-actions"><button class="secondary-button" type="button" data-action="close-modal">ยกเลิก</button><button class="primary-button" type="submit">บันทึกข้อมูล</button></div>
    </form>`, { wide: true });
    $("#memberProfileForm").addEventListener("submit", saveMemberProfile);
    bindProfileImagePreview($("#memberProfileForm"));
  }
  function openMemberCreateForm() {
    if (!can("create-member")) { toast("บัญชีของคุณไม่มีสิทธิ์เพิ่มสมาชิก", true); return; }
    const availableRoles = authSession.role === "super_admin"
      ? ["user", "admin", "staff", "super_admin"]
      : ["user", "staff", "admin"];
    openModal("เพิ่มสมาชิก", "สร้างบัญชีใหม่สำหรับผู้ใช้งานระบบจองห้องประชุม", `<form id="memberCreateForm">
      <div class="form-grid">
        ${profileImageField("newMemberProfileImage", true)}
        <div class="form-field"><label for="newMemberNamePrefix">คำนำหน้า<span class="required">*</span></label><select class="form-control" id="newMemberNamePrefix" name="namePrefix" required>${prefixOptions()}</select></div>
        <div class="form-field"><label for="newMemberName">ชื่อ–นามสกุล<span class="required">*</span></label><input class="form-control" id="newMemberName" name="name" maxlength="100" required></div>
        <div class="form-field"><label for="newMemberType">สถานะสมาชิก<span class="required">*</span></label><select class="form-control" id="newMemberType" name="memberType" required>${memberTypeOptions()}</select></div>
        <div class="form-field"><label for="newMemberEmail">อีเมล / ชื่อผู้ใช้<span class="required">*</span></label><input class="form-control" id="newMemberEmail" name="email" type="email" maxlength="254" placeholder="name@crru.ac.th" required></div>
        <div class="form-field"><label for="newMemberDepartment">หน่วยงาน / สาขาวิชา</label><input class="form-control" id="newMemberDepartment" name="department" maxlength="100"></div>
        <div class="form-field"><label for="newMemberPhone">เบอร์โทรศัพท์</label><input class="form-control" id="newMemberPhone" name="phone" type="tel" maxlength="20"></div>
        <div class="form-field"><label for="newMemberRole">บทบาท<span class="required">*</span></label><select class="form-control" id="newMemberRole" name="role" required>${availableRoles.map(role => `<option value="${role}">${memberRoleLabels[role]}</option>`).join("")}</select></div>
        <div class="form-field"><label for="newMemberPassword">รหัสผ่านเริ่มต้น<span class="required">*</span></label><input class="form-control" id="newMemberPassword" name="password" type="password" minlength="8" maxlength="72" autocomplete="new-password" required></div>
        <div class="form-field full"><label for="newMemberPasswordConfirm">ยืนยันรหัสผ่าน<span class="required">*</span></label><input class="form-control" id="newMemberPasswordConfirm" name="passwordConfirm" type="password" minlength="8" maxlength="72" autocomplete="new-password" required></div>
      </div>
      <div class="inline-note">อีเมลต้องลงท้ายด้วย @crru.ac.th กรุณาส่งมอบรหัสผ่านเริ่มต้นให้สมาชิกผ่านช่องทางที่ปลอดภัย</div>
      <div class="modal-actions"><button class="secondary-button" type="button" data-action="close-modal">ยกเลิก</button><button class="primary-button" type="submit">สร้างบัญชี</button></div>
    </form>`, { wide: true });
    $("#memberCreateForm").addEventListener("submit", createMember);
    bindProfileImagePreview($("#memberCreateForm"));
  }
  async function createMember(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    const password = String(values.password);
    if (password !== String(values.passwordConfirm)) { toast("รหัสผ่านและการยืนยันไม่ตรงกัน", true); return; }
    if (password.length < 8 || new TextEncoder().encode(password).length > 72) { toast("รหัสผ่านต้องมีความยาว 8–72 ไบต์", true); return; }
    try {
      const profileImage = await selectedProfileImage(form, "", true);
      const result = await api("member-create", {
        namePrefix: String(values.namePrefix || ""),
        name: String(values.name).trim(),
        memberType: String(values.memberType || ""),
        email: String(values.email).trim().toLowerCase(),
        department: String(values.department || "").trim(),
        phone: String(values.phone || "").trim(),
        profileImage,
        role: String(values.role),
        password
      });
      if (can("manage-members")) members = [result.member, ...members];
      closeModal();
      toast(`เพิ่มสมาชิก ${result.member.name} สำเร็จ`);
      if (can("manage-members")) render();
    } catch (error) {
      toast(`เพิ่มสมาชิกไม่สำเร็จ: ${error.message}`, true);
    }
  }
  async function saveMemberProfile(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    const newPassword = String(values.newPassword || "");
    if (newPassword !== String(values.confirmPassword || "")) { toast("รหัสผ่านใหม่และการยืนยันไม่ตรงกัน", true); return; }
    if (newPassword && (newPassword.length < 8 || new TextEncoder().encode(newPassword).length > 72)) { toast("รหัสผ่านใหม่ต้องมีความยาว 8–72 ไบต์", true); return; }
    const member = members.find(item => String(item.id) === form.dataset.memberId);
    if (!member) { toast("ไม่พบสมาชิกที่ต้องการแก้ไข", true); return; }
    let profileImage;
    try {
      profileImage = await selectedProfileImage(form, member.profileImage || "");
    } catch (error) {
      toast(`ไม่สามารถอ่านรูปโปรไฟล์ได้: ${error.message}`, true);
      return;
    }
    const saved = await updateMember(member.id, {
      email: String(values.email).trim().toLowerCase(),
      namePrefix: String(values.namePrefix || ""),
      name: String(values.name).trim(),
      memberType: String(values.memberType || ""),
      department: String(values.department || "").trim(),
      phone: String(values.phone || "").trim(),
      profileImage,
      newPassword
    });
    if (saved) closeModal();
  }
  const selectRoomOptions = selected => state.rooms.filter(room => room.status === "active").map(room => `<option value="${esc(room.id)}" ${room.id === selected ? "selected" : ""}>${esc(room.name)} · ${room.capacity} ที่นั่ง</option>`).join("");
  function openBookingForm(editId = "", selectedRoom = "") {
    const existing = state.bookings.find(item => item.id === editId);
    if (existing && ((!can("edit-own-booking") || !isBookingOwner(existing)) && !can("manage-all-bookings"))) { toast("ไม่มีสิทธิ์แก้ไขคำขอจองนี้", true); return; }
    if (!existing && !can("create-booking")) { toast("บัญชีของคุณไม่มีสิทธิ์สร้างคำขอจอง", true); return; }
    const initial = existing || { roomId: selectedRoom || state.rooms.find(room => room.status === "active")?.id || "", title: "", department: authSession?.department || "", attendees: "", purpose: "", startDate: isoDate(today), endDate: isoDate(today), startTime: "09:00", endTime: "10:00", equipment: [], note: "", signature: "" };
    if (existing && existing.status !== "pending") { toast("แก้ไขได้เฉพาะคำขอที่รออนุมัติ", true); return; }
    const equipment = ["โปรเจกเตอร์", "เครื่องเสียง", "ไมโครโฟน", "จอแสดงผล", "กล้องประชุม", "กระดานไวท์บอร์ด"];
    openModal(existing ? "แก้ไขคำขอจอง" : "จองห้องประชุม", "ระบุรายละเอียดการใช้งานให้ครบถ้วน และลงลายเซ็นก่อนส่งคำขอ", `<form id="bookingForm" data-edit-id="${esc(editId)}">
      <div class="form-grid"><div class="form-field full"><label>ห้องประชุม<span class="required">*</span></label><select name="roomId" class="form-control" required>${selectRoomOptions(initial.roomId)}</select></div>
      <div class="form-field full"><label>หัวข้อการประชุม / กิจกรรม<span class="required">*</span></label><input class="form-control" name="title" maxlength="150" required placeholder="เช่น ประชุมวางแผนการสอน" value="${esc(initial.title)}"></div>
      <div class="form-field"><label>หน่วยงาน / สาขาวิชา<span class="required">*</span></label><input class="form-control" name="department" maxlength="100" required placeholder="ระบุหน่วยงาน" value="${esc(initial.department)}"></div>
      <div class="form-field"><label>จำนวนผู้เข้าร่วม<span class="required">*</span></label><input class="form-control" name="attendees" type="number" min="1" required placeholder="จำนวนคน" value="${esc(initial.attendees)}"></div>
      <div class="form-field full"><label>ช่วงวันที่ใช้งาน<span class="required">*</span></label><div class="form-grid"><div class="form-field"><label>วันที่เริ่ม</label><input class="form-control" name="startDate" type="date" required value="${esc(initial.startDate)}"></div><div class="form-field"><label>วันที่สิ้นสุด</label><input class="form-control" name="endDate" type="date" required value="${esc(initial.endDate)}"></div></div><span class="field-hint">การจองหลายวันใช้ช่วงเวลาเดียวกันในทุกวัน เช่น 08:00–10:00 ของวันที่เริ่มถึงวันที่สิ้นสุด</span></div>
      <div class="form-field full"><label>เวลาใช้งานในแต่ละวัน<span class="required">*</span></label><div class="time-row"><input class="form-control" name="startTime" type="time" required value="${esc(initial.startTime)}"><span>ถึง</span><input class="form-control" name="endTime" type="time" required value="${esc(initial.endTime)}"></div></div>
      <div class="form-field full"><label>วัตถุประสงค์<span class="required">*</span></label><select class="form-control" name="purpose" required><option value="">เลือกวัตถุประสงค์</option>${["ประชุมวางแผนงาน", "ประชุมคณะกรรมการ", "ประชุมโครงการ", "อบรม / สัมมนา", "ประชุมกลุ่มย่อย", "กิจกรรมการเรียนการสอน", "อื่น ๆ"].map(value => `<option value="${value}" ${initial.purpose === value ? "selected" : ""}>${value}</option>`).join("")}</select></div>
      <div class="form-field full"><span class="field-label">อุปกรณ์ที่ต้องการ</span><div class="equipment-options">${equipment.map((value, index) => `<label class="equipment-option"><input type="checkbox" name="equipment" value="${value}" ${(initial.equipment || []).includes(value) ? "checked" : ""}><span>${value}</span></label>`).join("")}</div></div>
      <div class="form-field full"><label>หมายเหตุเพิ่มเติม</label><textarea class="form-control" name="note" maxlength="500" placeholder="รายละเอียดสำหรับผู้อนุมัติหรือเจ้าหน้าที่ดูแลห้อง">${esc(initial.note)}</textarea></div>
      <div class="form-field full"><span class="field-label">ลายเซ็นผู้จอง${state.policy.requireSignature ? '<span class="required">*</span>' : ""}</span><div class="signature-wrap"><canvas id="signatureCanvas" aria-label="พื้นที่ลงลายเซ็น"></canvas><div class="signature-controls"><span>ลงชื่อในกรอบ หรือเลือกแนบไฟล์ภาพ</span><button type="button" data-action="clear-signature">ล้างลายเซ็น</button></div></div><div style="margin-top:7px"><input class="upload-input" type="file" id="signatureFile" accept="image/png,image/jpeg,image/webp"></div><span class="field-hint">ลายเซ็นจะบันทึกในเบราว์เซอร์นี้พร้อมคำขอจอง</span></div>
      <div class="form-field full"><div class="inline-note">คำขอของคุณจะถูกส่งให้ผู้อนุมัติตรวจสอบ ระบบจะตรวจสอบห้องว่างก่อนรับคำขอ และตรวจซ้ำอีกครั้งก่อนอนุมัติ</div></div>
      </div><div id="bookingConflict"></div><div class="modal-actions"><button class="secondary-button" type="button" data-action="close-modal">ยกเลิก</button><button class="primary-button" type="submit">${existing ? "บันทึกการแก้ไข" : "ส่งคำขอจอง"}</button></div></form>`, { wide: true });
    signatureDirty = false;
    const canvas = $("#signatureCanvas");
    const ctx = canvas.getContext("2d");
    const resizeCanvas = () => {
      const ratio = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      if (!rect.width) return;
      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;
      ctx.scale(ratio, ratio);
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#1b5e49";
      if (initial.signature) {
        const image = new Image();
        image.onload = () => ctx.drawImage(image, 8, 8, rect.width - 16, rect.height - 16);
        image.src = initial.signature;
      }
    };
    resizeCanvas();
    let drawing = false;
    const point = event => {
      const rect = canvas.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };
    canvas.addEventListener("pointerdown", event => { drawing = true; canvas.setPointerCapture(event.pointerId); const p = point(event); ctx.beginPath(); ctx.moveTo(p.x, p.y); signatureDirty = true; });
    canvas.addEventListener("pointermove", event => { if (!drawing) return; const p = point(event); ctx.lineTo(p.x, p.y); ctx.stroke(); });
    canvas.addEventListener("pointerup", () => { drawing = false; });
    canvas.addEventListener("pointercancel", () => { drawing = false; });
    $("#signatureFile").addEventListener("change", event => {
      const file = event.target.files[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) { toast("ไฟล์ลายเซ็นต้องมีขนาดไม่เกิน 2 MB", true); event.target.value = ""; return; }
      const reader = new FileReader();
      reader.onerror = () => toast("อ่านไฟล์ลายเซ็นไม่สำเร็จ", true);
      reader.onload = () => {
        const image = new Image();
        image.onerror = () => toast("ไฟล์นี้ไม่ใช่ภาพที่รองรับ", true);
        image.onload = () => { ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(image, 8, 8, canvas.clientWidth - 16, canvas.clientHeight - 16); signatureDirty = true; };
        image.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
    $("#bookingForm").addEventListener("submit", saveBooking);
  }
  async function saveBooking(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const room = roomById(data.get("roomId"));
    const startDate = data.get("startDate");
    const endDate = data.get("endDate");
    const startTime = data.get("startTime");
    const endTime = data.get("endTime");
    const attendees = Number(data.get("attendees"));
    const editId = form.dataset.editId;
    const existing = editId ? state.bookings.find(item => item.id === editId) : null;
    if (editId && (!existing || ((!can("edit-own-booking") || !isBookingOwner(existing)) && !can("manage-all-bookings")))) {
      toast("ไม่มีสิทธิ์แก้ไขคำขอจองนี้", true);
      return;
    }
    if (!editId && !can("create-booking")) {
      toast("บัญชีของคุณไม่มีสิทธิ์สร้างคำขอจอง", true);
      return;
    }
    const conflictBox = $("#bookingConflict");
    const showError = message => { conflictBox.innerHTML = `<div class="conflict-note">${esc(message)}</div>`; toast(message, true); };
    if (!room || room.status !== "active") { showError("ห้องนี้ปิดให้บริการแล้ว กรุณาเลือกห้องอื่น"); return; }
    if (!startDate || !endDate || endDate < startDate) { showError("วันที่สิ้นสุดต้องไม่อยู่ก่อนวันที่เริ่ม"); return; }
    if (startDate < isoDate(today) && !existing) { showError("ไม่สามารถส่งคำขอจองย้อนหลังได้"); return; }
    const endDaysAhead = Math.round((new Date(`${endDate}T00:00:00`) - new Date(`${isoDate(today)}T00:00:00`)) / 86400000);
    if (endDaysAhead > state.policy.maxDaysAhead) { showError(`จองล่วงหน้าได้ไม่เกิน ${state.policy.maxDaysAhead} วัน`); return; }
    if (startTime >= endTime) { showError("เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มต้น"); return; }
    const duration = (new Date(`1970-01-01T${endTime}:00`) - new Date(`1970-01-01T${startTime}:00`)) / 3600000;
    if (duration > state.policy.maxDurationHours) { showError(`ระยะเวลาจองต้องไม่เกิน ${state.policy.maxDurationHours} ชั่วโมงต่อวัน`); return; }
    if (attendees > room.capacity) { showError(`จำนวนผู้เข้าร่วมเกินความจุห้อง (${room.capacity} ที่นั่ง)`); return; }
    if (state.policy.requireSignature && !signatureDirty && !existing?.signature) { showError("กรุณาลงลายเซ็นหรือแนบไฟล์ภาพลายเซ็นก่อนส่งคำขอ"); return; }
    const conflict = bookingsConflict(room.id, startDate, endDate, startTime, endTime, editId);
    if (conflict) { showError(`ช่วงเวลานี้มีคำขอ "${conflict.title}" ใช้ห้องเดียวกันอยู่แล้ว (${fullDate(conflict.startDate)}, ${conflict.startTime}–${conflict.endTime})`); return; }
    const canvas = $("#signatureCanvas");
    let signature = existing?.signature || "";
    if (signatureDirty) {
      try { signature = canvas.toDataURL("image/png"); }
      catch (error) { console.error("Unable to save signature:", error); showError("บันทึกลายเซ็นไม่สำเร็จ กรุณาลองลงชื่ออีกครั้ง"); return; }
    }
    const booking = {
      ...(existing || {}),
      id: existing?.id || `BK-${String(Date.now()).slice(-8)}`,
      roomId: room.id, user: existing?.user || currentUserName(), email: existing?.email || authSession?.email || `${currentUserName().replace(/\s/g, "").toLowerCase()}@crru.ac.th`,
      department: String(data.get("department")).trim() || authSession?.department || "", title: String(data.get("title")).trim(), purpose: String(data.get("purpose")),
      attendees, startDate, endDate, startTime, endTime, equipment: data.getAll("equipment"), note: String(data.get("note")).trim(),
      signature, status: existing?.status || "pending", prepStatus: existing?.prepStatus || "waiting", createdAt: existing?.createdAt || new Date().toISOString()
    };
    if (existing) state.bookings[state.bookings.findIndex(item => item.id === editId)] = booking;
    else state.bookings.unshift(booking);
    if (!safeSave()) return;
    addNotification(existing ? "แก้ไขคำขอจองแล้ว" : "มีคำขอจองใหม่", `${booking.title} · ${room.name} · ${fullDate(startDate)} ${startTime}–${endTime}`);
    closeModal();
    render();
    toast(existing ? "บันทึกการแก้ไขคำขอแล้ว" : "ส่งคำขอจองเรียบร้อย", false, existing ? "" : "ระบบกำลังส่งอีเมลแจ้งผู้อนุมัติ");
  }
  async function bookingDetail(id) {
    const booking = state.bookings.find(item => item.id === id);
    if (!booking) { toast("ไม่พบรายการจอง", true); return; }
    if (!canViewBooking(booking)) { toast("บัญชีของคุณไม่มีสิทธิ์ดูรายละเอียดคำขอนี้", true); return; }
    if (booking.status === "pending" && can("approve-booking") && !staffMembersLoaded && !staffMembersLoading) {
      await loadStaffMembers();
    }
    const room = roomById(booking.roomId);
    const rejection = booking.rejectionReason ? `<div class="conflict-note"><strong>เหตุผลที่ไม่อนุมัติ:</strong> ${esc(booking.rejectionReason)}</div>` : "";
    const signature = booking.signature ? `<div class="form-field" style="margin-top:12px"><span class="field-label">ลายเซ็นผู้จอง</span><img class="signature-preview" src="${esc(booking.signature)}" alt="ลายเซ็นผู้จอง"></div>` : "";
    const assignment = booking.status === "pending" && can("approve-booking")
      ? `<div class="form-field" style="margin-top:14px"><label>เจ้าหน้าที่ผู้รับงาน<span class="required">*</span></label><select class="form-control" data-assignment-booking="${esc(id)}" ${!staffMembers.length ? "disabled" : ""}><option value="">เลือกเจ้าหน้าที่ก่อนอนุมัติ</option>${staffMembers.map(staff => `<option value="${staff.id}" ${Number(approvalAssignments[id] || booking.assignedStaffId) === staff.id ? "selected" : ""}>${esc(staff.name)}${staff.department ? ` · ${esc(staff.department)}` : ""}</option>`).join("")}</select></div>`
      : booking.assignedStaffName ? `<div class="detail-item" style="margin-top:12px"><small>เจ้าหน้าที่ผู้รับงาน</small><strong>${esc(booking.assignedStaffName)}</strong></div>` : "";
    const approveDisabled = !staffMembers.some(staff => staff.id === Number(approvalAssignments[id] || booking.assignedStaffId));
    openModal("รายละเอียดคำขอจอง", `เลขที่ ${esc(booking.id)} · ส่งคำขอเมื่อ ${timestamp(booking.createdAt)}`, `<div class="detail-grid"><div class="detail-item"><small>หัวข้อ / กิจกรรม</small><strong>${esc(booking.title)}</strong></div><div class="detail-item"><small>สถานะล่าสุด</small>${badge(booking)}</div><div class="detail-item"><small>ห้องประชุม</small><strong>${esc(room?.name || "ไม่พบห้อง")} · ${esc(room?.number || "")}</strong></div><div class="detail-item"><small>ผู้จอง / หน่วยงาน</small><strong>${esc(booking.user)}<br>${esc(booking.department || "—")}</strong></div><div class="detail-item"><small>วันที่ใช้งาน</small><strong>${esc(fullDate(booking.startDate))}${booking.endDate !== booking.startDate ? ` ถึง ${esc(fullDate(booking.endDate))}` : ""}</strong></div><div class="detail-item"><small>เวลาในแต่ละวัน</small><strong>${booking.startTime}–${booking.endTime}</strong></div><div class="detail-item"><small>ผู้เข้าร่วม / วัตถุประสงค์</small><strong>${booking.attendees} คน · ${esc(booking.purpose || "—")}</strong></div><div class="detail-item"><small>อุปกรณ์ที่ต้องการ</small><strong>${esc(booking.equipment?.join(", ") || "ไม่ระบุ")}</strong></div><div class="detail-item" style="grid-column:1/-1"><small>หมายเหตุ</small><strong>${esc(booking.note || "ไม่มีหมายเหตุเพิ่มเติม")}</strong></div></div>${assignment}${rejection}${signature}<div class="modal-actions"><button class="secondary-button" data-action="close-modal">ปิด</button>${booking.status === "pending" && can("approve-booking") ? `<button class="danger-button" data-action="reject-booking" data-id="${esc(id)}">ไม่อนุมัติ</button><button class="primary-button" data-action="approve-booking" data-id="${esc(id)}" ${approveDisabled ? "disabled" : ""}>อนุมัติและส่งงาน</button>` : ""}</div>`);
  }
  function askReason(id) {
    if (!can("approve-booking")) { toast("ไม่มีสิทธิ์ตัดสินคำขอจอง", true); return; }
    const booking = state.bookings.find(item => item.id === id);
    if (!booking) return;
    openModal("ไม่อนุมัติคำขอจอง", "โปรดระบุเหตุผลเพื่อแจ้งกลับไปยังผู้จองทางอีเมล", `<form id="rejectForm" data-id="${esc(id)}"><div class="form-field"><label>เหตุผลที่ไม่อนุมัติ<span class="required">*</span></label><textarea class="form-control" name="reason" required maxlength="500" placeholder="เช่น ห้องไม่ว่างในช่วงเวลาที่เลือก หรือรายละเอียดคำขอไม่ครบถ้วน"></textarea></div><div class="modal-actions"><button class="secondary-button" type="button" data-action="close-modal">กลับ</button><button class="danger-button" type="submit">ยืนยันไม่อนุมัติ</button></div></form>`);
    $("#rejectForm").addEventListener("submit", event => {
      event.preventDefault();
      if (!can("approve-booking")) { toast("ไม่มีสิทธิ์ตัดสินคำขอจอง", true); return; }
      const reason = new FormData(event.currentTarget).get("reason").trim();
      if (!reason) return;
      booking.status = "rejected";
      booking.rejectionReason = reason;
      safeSave();
      addNotification("คำขอจองไม่ได้รับอนุมัติ", `${booking.title} · ${reason}`);
      closeModal(); render();
      toast("บันทึกผลไม่อนุมัติแล้ว", false, "ระบบแจ้งเหตุผลให้ผู้จองทราบแล้ว");
    });
  }
  function approveBooking(id) {
    if (!can("approve-booking")) { toast("ไม่มีสิทธิ์อนุมัติคำขอจอง", true); return; }
    const booking = state.bookings.find(item => item.id === id);
    if (!booking || booking.status !== "pending") { toast("คำขอนี้ไม่อยู่ในสถานะรออนุมัติ", true); return; }
    const selectedStaffId = approvalAssignments[id] || document.querySelector(`[data-assignment-booking="${CSS.escape(id)}"]`)?.value || "";
    const assignedStaff = staffMembers.find(staff => staff.id === Number(selectedStaffId));
    if (!assignedStaff) { toast("กรุณาเลือกเจ้าหน้าที่ผู้รับงานก่อนอนุมัติ", true); return; }
    const conflict = bookingsConflict(booking.roomId, booking.startDate, booking.endDate, booking.startTime, booking.endTime, booking.id);
    if (conflict) { toast(`ไม่สามารถอนุมัติได้: ช่วงเวลาชนกับ ${conflict.title}`, true, "โปรดติดต่อผู้จองหรือเลือกปฏิเสธพร้อมแจ้งเหตุผล"); return; }
    booking.status = "approved";
    booking.prepStatus = "waiting";
    booking.assignedStaffId = assignedStaff.id;
    booking.assignedStaffName = assignedStaff.name;
    booking.approvedBy = roleLabels[authSession.role].name;
    booking.approvedAt = new Date().toISOString();
    safeSave();
    addNotification("คำขอจองได้รับอนุมัติ", `${booking.title} · ส่งต่องานเตรียมห้องให้เจ้าหน้าที่แล้ว`);
    closeModal(); render();
    toast("อนุมัติคำขอเรียบร้อย", false, "ส่งต่อคิวและกำลังแจ้งเจ้าหน้าที่ทางอีเมล");
  }
  function cancelBooking(id) {
    const booking = state.bookings.find(item => item.id === id);
    if (!booking || !allowedToCancel(booking)) { toast("ไม่สามารถยกเลิกรายการนี้ได้ตามกฎที่กำหนด", true); return; }
    if (!window.confirm(`ยืนยันยกเลิก "${booking.title}" ใช่หรือไม่?`)) return;
    booking.status = "cancelled";
    safeSave();
    addNotification("ยกเลิกรายการจองแล้ว", `${booking.title} · ${fullDate(booking.startDate)}`);
    render(); toast("ยกเลิกรายการจองแล้ว");
  }
  function deleteBooking(id) {
    const booking = state.bookings.find(item => item.id === id);
    if (!booking || !can("manage-own-booking") && !can("manage-all-bookings") || !state.policy.allowDelete || !state.policy.deletableStatuses.includes(booking.status) || (!isBookingOwner(booking) && !can("manage-all-bookings"))) { toast("ลบรายการนี้ไม่ได้ตามกฎที่กำหนด", true); return; }
    if (!window.confirm(`ลบรายการ "${booking.title}" ออกจากระบบอย่างถาวรหรือไม่?`)) return;
    state.bookings = state.bookings.filter(item => item.id !== id);
    safeSave(); render(); toast("ลบรายการแล้ว");
  }
  function openRoomForm(id = "") {
    if (!can("manage-rooms")) { toast("ไม่มีสิทธิ์จัดการข้อมูลห้องประชุม", true); return; }
    const room = state.rooms.find(item => item.id === id) || { name: "", number: "", building: "", capacity: 20, status: "active", description: "", equipment: [], visual: "visual-green" };
    openModal(id ? "แก้ไขข้อมูลห้อง" : "เพิ่มห้องประชุม", "จัดการข้อมูลห้องและอุปกรณ์สำหรับแค็ตตาล็อก", `<form id="roomForm" data-id="${esc(id)}"><div class="form-grid"><div class="form-field"><label>ชื่อห้อง<span class="required">*</span></label><input class="form-control" name="name" required maxlength="100" value="${esc(room.name)}"></div><div class="form-field"><label>เลขห้อง / ตำแหน่ง<span class="required">*</span></label><input class="form-control" name="number" required maxlength="100" value="${esc(room.number)}"></div><div class="form-field"><label>อาคาร<span class="required">*</span></label><input class="form-control" name="building" required maxlength="100" value="${esc(room.building)}"></div><div class="form-field"><label>จำนวนที่นั่ง<span class="required">*</span></label><input class="form-control" name="capacity" type="number" min="1" max="1000" required value="${esc(room.capacity)}"></div><div class="form-field full"><label>รายละเอียด</label><textarea class="form-control" name="description" maxlength="500">${esc(room.description)}</textarea></div><div class="form-field full"><label>อุปกรณ์ (คั่นแต่ละรายการด้วยเครื่องหมายจุลภาค)</label><input class="form-control" name="equipment" value="${esc((room.equipment || []).join(", "))}"></div><div class="form-field"><label>สถานะ</label><select class="form-control" name="status"><option value="active" ${room.status === "active" ? "selected" : ""}>พร้อมใช้งาน</option><option value="inactive" ${room.status === "inactive" ? "selected" : ""}>ปิดใช้งาน</option></select></div><div class="form-field"><label>รูปภาพห้อง (ไม่บังคับ)</label><input class="upload-input" type="file" name="image" accept="image/png,image/jpeg,image/webp"></div></div><div class="modal-actions"><button class="secondary-button" type="button" data-action="close-modal">ยกเลิก</button><button class="primary-button" type="submit">บันทึกห้อง</button></div></form>`);
    $("#roomForm").addEventListener("submit", saveRoom);
  }
  function saveRoom(event) {
    event.preventDefault();
    if (!can("manage-rooms")) { toast("ไม่มีสิทธิ์จัดการข้อมูลห้องประชุม", true); return; }
    const form = event.currentTarget;
    const data = new FormData(form);
    const editId = form.dataset.id;
    const existing = state.rooms.find(item => item.id === editId);
    const file = data.get("image");
    const save = image => {
      const entry = { ...(existing || {}), id: existing?.id || `room-${Date.now()}`, name: String(data.get("name")).trim(), number: String(data.get("number")).trim(), building: String(data.get("building")).trim(), capacity: Number(data.get("capacity")), description: String(data.get("description")).trim(), equipment: String(data.get("equipment")).split(",").map(item => item.trim()).filter(Boolean), status: data.get("status"), visual: existing?.visual || ["visual-green", "visual-blue", "visual-sand", "visual-lilac"][state.rooms.length % 4], ...(image ? { image } : {}) };
      if (existing) state.rooms[state.rooms.findIndex(item => item.id === editId)] = entry;
      else state.rooms.push(entry);
      safeSave(); closeModal(); render(); toast(existing ? "บันทึกข้อมูลห้องแล้ว" : "เพิ่มห้องประชุมแล้ว");
    };
    if (file && file.size > 0) {
      if (file.size > 3 * 1024 * 1024) { toast("รูปภาพต้องมีขนาดไม่เกิน 3 MB", true); return; }
      const reader = new FileReader(); reader.onerror = () => toast("อ่านรูปภาพไม่สำเร็จ", true); reader.onload = () => save(reader.result); reader.readAsDataURL(file);
    } else save(existing?.image || "");
  }
  function saveSettings(event) {
    event.preventDefault();
    if (!can("manage-system")) { toast("เฉพาะ Super Admin เท่านั้นที่ตั้งค่าระบบได้", true); return; }
    const data = new FormData(event.currentTarget);
    const maxDaysAhead = Number(data.get("maxDaysAhead"));
    const maxDurationHours = Number(data.get("maxDurationHours"));
    if (!Number.isInteger(maxDaysAhead) || maxDaysAhead < 1 || maxDaysAhead > 365 || !Number.isInteger(maxDurationHours) || maxDurationHours < 1 || maxDurationHours > 24) { toast("กรุณาตรวจสอบค่าระยะเวลาที่กำหนด", true); return; }
    state.policy = { ...state.policy, maxDaysAhead, maxDurationHours, editUntil: data.get("editUntil"), requireSignature: data.has("requireSignature"), allowPastCancel: data.has("allowPastCancel"), allowDelete: data.has("allowDelete"), notifyEmail: data.has("notifyEmail"), notifyLine: data.has("notifyLine"), deletableStatuses: data.getAll("deletableStatuses") };
    safeSave(); toast("บันทึกกฎและการตั้งค่าแล้ว"); render();
  }
  function openNotifications() {
    state.notifications.forEach(item => { item.read = true; });
    safeSave(); updateNotificationDot();
    openModal("การแจ้งเตือน", "รายการกิจกรรมและสถานะล่าสุดในระบบ", `<div class="notification-list">${state.notifications.length ? state.notifications.map(item => `<div class="notification-item"><span class="notification-icon">${item.title.includes("ไม่") ? "!" : "✓"}</span><div><strong>${esc(item.title)}</strong><small>${esc(item.text)}</small><small>${timestamp(item.time)}</small></div></div>`).join("") : `<div class="empty-state">ไม่มีการแจ้งเตือน</div>`}</div><div class="modal-actions"><button class="secondary-button" data-action="close-modal">ปิด</button>${can("manage-system") ? '<button class="reset-link" data-action="reset-data">คืนค่าข้อมูลตัวอย่าง</button>' : ""}</div>`);
  }
  async function loadMembers() {
    if (!can("manage-members") || membersLoading) return;
    membersLoading = true;
    membersLoadError = "";
    render();
    try {
      const result = await api("members");
      if (!Array.isArray(result.members)) throw new Error("เซิร์ฟเวอร์ส่งข้อมูลสมาชิกกลับมาไม่ถูกต้อง");
      members = result.members;
      membersLoaded = true;
    } catch (error) {
      membersLoadError = `โหลดข้อมูลสมาชิกไม่สำเร็จ: ${error.message}`;
    } finally {
      membersLoading = false;
      if (currentPage === "members" || currentPage === "statistics") render();
    }
  }
  async function loadStatistics() {
    if (authSession?.role !== "super_admin" || statisticsLoading) return;
    const requestedMonth = statisticsMonth;
    statisticsLoading = true;
    statisticsLoadError = "";
    render();
    try {
      const result = await api("statistics", null, { month: requestedMonth });
      if (result.month !== requestedMonth || !result.members || typeof result.members !== "object") {
        throw new Error("เซิร์ฟเวอร์ส่งข้อมูลสถิติกลับมาไม่ถูกต้อง");
      }
      if (statisticsMonth === requestedMonth) statisticsData = result;
    } catch (error) {
      if (statisticsMonth === requestedMonth) statisticsLoadError = `โหลดข้อมูลสถิติไม่สำเร็จ: ${error.message}`;
    } finally {
      statisticsLoading = false;
      if (currentPage === "statistics") {
        if (statisticsMonth !== requestedMonth) loadStatistics();
        else render();
      }
    }
  }
  async function loadStaffMembers() {
    if (!can("approve-booking") || staffMembersLoading) return;
    staffMembersLoading = true;
    staffMembersError = "";
    render();
    try {
      const result = await api("staff-members");
      if (!Array.isArray(result.staff)) throw new Error("เซิร์ฟเวอร์ส่งรายชื่อเจ้าหน้าที่กลับมาไม่ถูกต้อง");
      staffMembers = result.staff;
      staffMembersLoaded = true;
    } catch (error) {
      staffMembersError = `โหลดรายชื่อเจ้าหน้าที่ไม่สำเร็จ: ${error.message}`;
    } finally {
      staffMembersLoading = false;
      if (currentPage === "approvals") render();
    }
  }
  async function refreshStaffQueue(manual = true) {
    if (!can("prepare-rooms")) return;
    staffStateRefreshAt = Date.now();
    try {
      const latest = await api("state");
      if (latest.version > stateVersion) {
        stateVersion = latest.version;
        state = mergeServerState(latest.state);
        render();
      } else if (manual) {
        toast("รายการงานเป็นข้อมูลล่าสุดแล้ว");
      }
    } catch (error) {
      if (manual) toast(`โหลดงานที่มอบหมายไม่สำเร็จ: ${error.message}`, true);
      else console.error("EduRoom could not refresh the assigned staff queue:", error);
    }
  }
  async function updateMember(id, changes) {
    if (!can("manage-members")) { toast("เฉพาะ Super Admin เท่านั้นที่จัดการสมาชิกได้", true); return; }
    const member = members.find(item => String(item.id) === String(id));
    if (!member || Number(id) === Number(authSession?.id)) { toast("ไม่สามารถแก้ไขบัญชีนี้ได้", true); return; }
    try {
      const result = await api("member-update", { id: Number(id), role: member.role, active: member.active, ...changes });
      members = members.map(item => Number(item.id) === Number(id) ? result.member : item);
      toast("บันทึกข้อมูลสมาชิกแล้ว");
      render();
      return true;
    } catch (error) {
      toast(`บันทึกข้อมูลสมาชิกไม่สำเร็จ: ${error.message}`, true);
      return false;
    }
  }
  function onAction(action, id, active) {
    const requiredPermission = {
      "new-booking": "create-booking", "book-room": "create-booking", "edit-booking": "edit-own-booking",
      "approve-booking": "approve-booking", "reject-booking": "approve-booking",
      "cancel-booking": "manage-own-booking", "delete-booking": "manage-own-booking",
      "add-room": "manage-rooms", "edit-room": "manage-rooms", "toggle-room": "manage-rooms", "delete-room": "manage-rooms",
      "accept-prep": "prepare-rooms", "start-prep": "prepare-rooms", "complete-prep": "prepare-rooms",
      "reset-data": "manage-system", "save-member-role": "manage-members", "toggle-member": "manage-members",
      "reload-members": "manage-members", "edit-profile": "manage-members", "edit-member": "manage-members",
      "create-member": "create-member", "reload-staff-members": "approve-booking",
      "refresh-staff-queue": "prepare-rooms", "export-statistics-csv": "manage-system", "print-statistics": "manage-system",
      "reload-statistics": "manage-system"
    }[action];
    if (requiredPermission && !can(requiredPermission) && !(requiredPermission === "manage-own-booking" && can("manage-all-bookings"))) {
      toast("บัญชีของคุณไม่มีสิทธิ์ดำเนินการนี้", true);
      return;
    }
    switch (action) {
      case "new-booking": openBookingForm(); break;
      case "book-room": openBookingForm("", id); break;
      case "edit-booking": openBookingForm(id); break;
      case "view-booking": bookingDetail(id); break;
      case "close-modal": closeModal(); break;
      case "clear-signature": {
        const canvas = $("#signatureCanvas"); if (canvas) { canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height); signatureDirty = false; }
        const file = $("#signatureFile"); if (file) file.value = "";
        break;
      }
      case "approve-booking": approveBooking(id); break;
      case "reject-booking": askReason(id); break;
      case "cancel-booking": cancelBooking(id); break;
      case "delete-booking": deleteBooking(id); break;
      case "add-room": openRoomForm(); break;
      case "edit-room": openRoomForm(id); break;
      case "toggle-room": {
        const room = roomById(id); if (!room) return;
        room.status = room.status === "active" ? "inactive" : "active";
        safeSave(); render(); toast(room.status === "active" ? "เปิดใช้งานห้องแล้ว" : "ปิดใช้งานห้องแล้ว"); break;
      }
      case "delete-room": {
        const room = roomById(id); if (!room) return;
        if (state.bookings.some(item => item.roomId === id && activeBooking(item))) { toast("ไม่สามารถลบห้องที่มีรายการจองอยู่ได้ ให้ปิดใช้งานห้องแทน", true); return; }
        if (!window.confirm(`ลบข้อมูล "${room.name}" หรือไม่?`)) return;
        state.rooms = state.rooms.filter(item => item.id !== id); safeSave(); render(); toast("ลบข้อมูลห้องแล้ว"); break;
      }
      case "accept-prep": changePrep(id, "accepted", "เจ้าหน้าที่รับงานเตรียมห้อง"); break;
      case "start-prep": changePrep(id, "preparing", "เริ่มจัดเตรียมห้องประชุม"); break;
      case "complete-prep": changePrep(id, "completed", "จัดเตรียมห้องเสร็จเรียบร้อย"); break;
      case "calendar-prev": calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1); render(); break;
      case "calendar-next": calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1); render(); break;
      case "calendar-today": calendarMonth = new Date(today.getFullYear(), today.getMonth(), 1); render(); break;
      case "notifications": openNotifications(); break;
      case "reload-staff-members":
        staffMembersError = "";
        staffMembersLoaded = false;
        loadStaffMembers();
        break;
      case "refresh-staff-queue": refreshStaffQueue(); break;
      case "export-statistics-csv": downloadStatisticsCsv(); break;
      case "reload-statistics":
        if (authSession?.role !== "super_admin") { toast("เฉพาะ Super Admin เท่านั้นที่ดูรายงานได้", true); break; }
        statisticsData = null;
        statisticsLoadError = "";
        loadStatistics();
        break;
      case "print-statistics":
        if (authSession?.role !== "super_admin") { toast("เฉพาะ Super Admin เท่านั้นที่ส่งออกรายงานได้", true); break; }
        window.print();
        break;
      case "edit-profile":
        $("#profileMenu").hidden = true;
        openProfileForm();
        break;
      case "create-member": openMemberCreateForm(); break;
      case "edit-member": openMemberForm(id); break;
      case "save-member-role": {
        const select = document.querySelector(`[data-member-role="${id}"]`);
        const member = members.find(item => String(item.id) === id);
        if (!select || !member) { toast("ไม่พบข้อมูลสมาชิกที่ต้องการแก้ไข", true); break; }
        updateMember(id, { role: select.value });
        break;
      }
      case "toggle-member": {
        const select = document.querySelector(`[data-member-role="${id}"]`);
        const member = members.find(item => String(item.id) === id);
        if (!select || !member) { toast("ไม่พบข้อมูลสมาชิกที่ต้องการแก้ไข", true); break; }
        updateMember(id, { active: active === "true" });
        break;
      }
      case "reload-members":
        membersLoadError = "";
        membersLoaded = false;
        loadMembers();
        break;
      case "reset-data":
        if (window.confirm("คืนค่าข้อมูลตัวอย่างหรือไม่? การจอง ห้อง และกฎที่บันทึกไว้จะถูกลบ")) {
          state = seedState(); state.role = authSession.role; safeSave(); closeModal(); render(); updateNotificationDot(); toast("คืนค่าข้อมูลตัวอย่างแล้ว");
        }
        break;
      default: break;
    }
  }
  function changePrep(id, status, message) {
    if (!can("prepare-rooms")) { toast("ไม่มีสิทธิ์จัดการงานเตรียมห้อง", true); return; }
    const booking = state.bookings.find(item => item.id === id);
    if (!booking || booking.status !== "approved") { toast("ไม่พบงานที่อนุมัติแล้ว", true); return; }
    booking.prepStatus = status;
    safeSave(); addNotification(message, `${booking.title} · ${roomById(booking.roomId)?.name || ""}`);
    render(); toast(message);
  }
  function renderLoginPreview() {
    const grid = $("#loginCalendarGrid");
    if (!grid) return;
    const year = today.getFullYear();
    const month = today.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const previewBookingDays = [dayOffset(1), dayOffset(4)];
    $("#loginCalendarMonth").textContent = `${monthNames[month]} ${year + 543}`;
    $("#loginBookingDayOne").textContent = String(new Date(`${dayOffset(1)}T00:00:00`).getDate()).padStart(2, "0");
    $("#loginBookingMonthOne").textContent = monthNames[new Date(`${dayOffset(1)}T00:00:00`).getMonth()].slice(0, 3);
    $("#loginBookingDayTwo").textContent = String(new Date(`${dayOffset(4)}T00:00:00`).getDate()).padStart(2, "0");
    $("#loginBookingMonthTwo").textContent = monthNames[new Date(`${dayOffset(4)}T00:00:00`).getMonth()].slice(0, 3);
    grid.innerHTML = `${weekNames.map(name => `<span class="login-calendar-weekday">${name}</span>`).join("")}${Array.from({ length: firstDay }, () => '<span class="login-calendar-day muted" aria-hidden="true"></span>').join("")}${Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const todayClass = date === isoDate(today) ? " is-today" : "";
      const bookingClass = previewBookingDays.includes(date) ? " has-booking" : "";
      return `<span class="login-calendar-day${todayClass}${bookingClass}"${date === isoDate(today) ? ' aria-current="date"' : ""}>${day}</span>`;
    }).join("")}`;
  }
  function showSplash() {
    const splash = $("#appSplash");
    const countdown = $("#splashCountdown");
    if (!splash || !countdown) return Promise.resolve();

    return new Promise(resolve => {
      let remaining = 3;
      countdown.textContent = String(remaining);
      const timer = window.setInterval(() => {
        remaining -= 1;
        countdown.textContent = remaining > 0 ? String(remaining) : "0";
        if (remaining <= 0) {
          window.clearInterval(timer);
          splash.classList.add("is-hidden");
          window.setTimeout(() => {
            splash.remove();
            resolve();
          }, 350);
        }
      }, 1000);
    });
  }

  async function init() {
    await showSplash();
    const now = new Date();
    $("#todayLabel").textContent = `${now.getDate()} ${monthNames[now.getMonth()].slice(0, 3)} ${now.getFullYear() + 543}`;
    renderLoginPreview();
    setFontScale(fontScale);
    setAuthenticatedView(false);
    updateNotificationDot();
    $("#loginForm").addEventListener("submit", signIn);
    $("#registerForm").addEventListener("submit", registerAccount);
    bindProfileImagePreview($("#registerForm"));
    $("#togglePassword").addEventListener("click", () => {
      const input = $("#loginPassword");
      const isVisible = input.type === "text";
      input.type = isVisible ? "password" : "text";
      $("#togglePassword").textContent = isVisible ? "แสดง" : "ซ่อน";
      $("#togglePassword").setAttribute("aria-label", isVisible ? "แสดงรหัสผ่าน" : "ซ่อนรหัสผ่าน");
    });
    document.querySelectorAll("[data-auth-view]").forEach(button => button.addEventListener("click", () => setAuthView(button.dataset.authView)));
    document.addEventListener("click", event => {
      const nav = event.target.closest("[data-page]");
      if (nav) { event.preventDefault(); navigate(nav.dataset.page); return; }
      const target = event.target.closest("[data-action]");
      if (target) {
        if (target.dataset.action === "logout") { signOut(); return; }
        if (target.dataset.action === "migrate-local-data") { migrateLegacyData(); return; }
        onAction(target.dataset.action, target.dataset.id || "", target.dataset.active || "");
        return;
      }
      if (event.target.closest("#profileButton")) {
        const menu = $("#profileMenu");
        const open = menu.hidden;
        menu.hidden = !open;
        $("#profileButton").setAttribute("aria-expanded", String(open));
        return;
      }
      if (!event.target.closest("#profileMenu")) {
        $("#profileMenu").hidden = true;
        $("#profileButton").setAttribute("aria-expanded", "false");
      }
      if (event.target === $("#modalBackdrop")) closeModal();
    });
    $("#notificationButton").addEventListener("click", openNotifications);
    $("#fontSizeDecrease").addEventListener("click", () => setFontScale(fontScale - 0.1));
    $("#fontSizeIncrease").addEventListener("click", () => setFontScale(fontScale + 0.1));
    $("#fontSizeReset").addEventListener("click", () => setFontScale(1));
    $("#mobileMenu").addEventListener("click", () => $("#sidebar").classList.toggle("open"));
    $("#todayButton").addEventListener("click", () => { calendarMonth = new Date(today.getFullYear(), today.getMonth(), 1); navigate("calendar"); });
    window.setInterval(() => {
      if (can("prepare-rooms")) refreshStaffQueue(false);
    }, 15000);
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && !$("#modalBackdrop").hidden) closeModal();
      if (event.key === "Escape" && !$("#profileMenu").hidden) {
        $("#profileMenu").hidden = true;
        $("#profileButton").setAttribute("aria-expanded", "false");
      }
    });
    try {
      const session = await api("session");
      if (session.user) {
        await activateAccount(session.user);
      } else {
        $("#loginEmail").focus();
      }
    } catch (error) {
      showLoginError(`เชื่อมต่อระบบไม่ได้: ${error.message}`);
      $("#loginEmail").focus();
    }
  }
  init();
})();
