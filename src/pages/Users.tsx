import React, { useState } from "react";
import { useApp } from "../contexts/AppContext";
import { motion, AnimatePresence } from "motion/react";
import { 
  Users, 
  UserPlus, 
  Trash2, 
  Lock, 
  ShieldCheck, 
  CircleAlert, 
  ShieldX,
  X,
  PlusCircle,
  AlertCircle,
  Edit
} from "lucide-react";

export default function UsersManagement() {
  const { 
    users, 
    addUser, 
    updateUser,
    deleteUser, 
    currentUser, 
    t, 
    language,
    errorMsg,
    setErrorMsg 
  } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"admin" | "cashier">("cashier");
  
  // Edit states
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editRole, setEditRole] = useState<"admin" | "cashier">("cashier");

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteTargetName, setDeleteTargetName] = useState<string>("");
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  // Guard block: ONLY admin can view user accounts
  if (currentUser?.role !== "admin") {
    return (
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="glass-bg neumorphic-flat max-w-lg mx-auto py-16 px-8 rounded-3xl border border-red-200 text-center flex flex-col items-center justify-center space-y-4 text-right"
      >
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-red-650 mb-2">
          <ShieldX className="w-9 h-9" />
        </div>
        <h3 className="text-lg font-bold text-slate-800">{t("access_denied")}</h3>
        <p className="text-xs text-slate-500 max-w-sm leading-relaxed text-center">
          عذراً، قسم إدارة شؤون الموظفين والامتيازات متاح فقط لحساب المسؤول الرئيسي (Admin). لا يمكنك إضافة أو تفتيش حسابات الكاشير الأخرى.
        </p>
      </motion.div>
    );
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!username || !password || !name) return;

    const payload = {
      username: username.toLowerCase().trim(),
      password,
      name,
      role,
    };

    const done = await addUser(payload);
    if (done) {
      setIsModalOpen(false);
      setUsername("");
      setPassword("");
      setName("");
      setRole("cashier");
    }
  };

  const handleStartEdit = (u: any) => {
    setErrorMsg(null);
    setEditingUser(u);
    setEditName(u.name);
    setEditUsername(u.username);
    setEditPassword("");
    setEditRole(u.role);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!editingUser) return;
    if (!editUsername || !editName) return;

    const payload = {
      name: editName,
      username: editUsername.toLowerCase().trim(),
      role: editRole,
      password: editPassword,
    };

    const done = await updateUser(editingUser.id, payload);
    if (done) {
      setEditingUser(null);
      setEditName("");
      setEditUsername("");
      setEditPassword("");
    }
  };

  const handleDelete = (id: string, nameToDelete: string) => {
    if (id === "u-1") {
      setAlertMsg(language === "ar" ? "لا يمكن حذف حساب المسؤول الافتراضي للنظام!" : "Cannot delete the default system administrator account!");
      return;
    }
    setDeleteTargetId(id);
    setDeleteTargetName(nameToDelete);
  };

  const confirmDelete = async () => {
    if (deleteTargetId) {
      await deleteUser(deleteTargetId);
      setDeleteTargetId(null);
      setDeleteTargetName("");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 text-right"
    >
      {/* Overview stats header */}
      <div className="glass-bg neumorphic-flat p-4 rounded-3xl border flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="text-right">
          <h3 className="text-md font-bold text-slate-700 flex items-center gap-1.5 justify-end">
            <span>{t("user_mgmt")}</span>
            <Users className="w-5 h-5 text-blue-500" />
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5">تسجيل وتعديل بيانات مستخدمي كاشير المبيعات</p>
        </div>

        {/* Action button triggers */}
        <button
          id="user-add-btn"
          onClick={() => {
            setErrorMsg(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:opacity-95 font-bold hover:shadow-md cursor-pointer transition neumorphic-btn text-xs select-none"
        >
          <UserPlus className="w-4 h-4" />
          <span>{t("add_user")}</span>
        </button>
      </div>

      {/* Warnings banner */}
      <div className="p-3.5 bg-blue-50/50 border border-blue-150 rounded-2xl text-[11px] text-slate-600 flex items-start gap-2 justify-end">
        <div className="flex-1 text-right">
          <span className="font-bold text-blue-800 block mb-0.5">سياسة الصلاحيات والوصول</span>
          <p className="text-slate-500 leading-normal">{t("permissions_warning")}</p>
        </div>
        <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
      </div>

      {/* Grid of Users list */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {users.map((u) => (
          <motion.div
            key={u.id}
            whileHover={{ y: -3 }}
            className="glass-bg neumorphic-flat p-5 rounded-3xl border flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between border-b pb-2.5 mb-3 select-none">
                <span className={`px-2.5 py-0.5 rounded-xl text-[10px] font-bold border ${
                  u.role === "admin" 
                    ? "bg-blue-50 text-blue-600 border-blue-105" 
                    : "bg-purple-50 text-purple-600 border-purple-105"
                }`}>
                  {u.role === "admin" ? t("admin_badge") : t("cashier_badge")}
                </span>

                <h4 className="text-sm font-extrabold text-slate-750 font-sans">{u.name}</h4>
              </div>

              <div className="space-y-2 text-xs text-slate-550 mb-4 text-right">
                <div className="flex items-center gap-2 justify-end">
                  <span className="font-semibold font-mono text-slate-700">{u.username}</span>
                  <span className="text-slate-400 font-bold">اسم المستخدم:</span>
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <span className="font-mono text-slate-400">••••••••</span>
                  <span className="text-slate-400 font-medium">الرمز السري:</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t select-none">
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                {u.id === "u-1" ? "حساب نظام محصن" : "مسجل في المخزن"}
              </span>

              <div className="flex items-center gap-1">
                <button
                  id={`user-edit-${u.id}`}
                  onClick={() => handleStartEdit(u)}
                  className="p-1.5 rounded-lg text-blue-500 hover:text-blue-750 hover:bg-blue-50 cursor-pointer transition"
                  title={language === "ar" ? "تعديل البيانات" : "Edit Details"}
                >
                  <Edit className="w-4 h-4" />
                </button>

                {u.id !== "u-1" && (
                  <button
                    id={`user-del-${u.id}`}
                    onClick={() => handleDelete(u.id, u.name)}
                    className="p-1.5 rounded-lg text-red-400 hover:text-red-650 hover:bg-red-50 cursor-pointer transition"
                    title={language === "ar" ? "حذف الحساب" : "Delete"}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Editing Dialog Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 text-right relative overflow-hidden border"
            >
              <div className="flex items-center justify-between border-b pb-3.5 mb-5">
                <button
                  id="user-modal-close"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
                <h3 className="text-md font-bold text-slate-850">
                  {t("add_user")}
                </h3>
              </div>

              {errorMsg && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2 justify-end">
                  <span>{errorMsg}</span>
                  <CircleAlert className="w-4 h-4" />
                </div>
              )}

              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">
                    {t("user_real_name")} <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="form-user-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="عبد الله عبد الرحمن"
                    className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-right focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">
                    {t("user_login_name")} <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="form-user-username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="abdullah123"
                    className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-right focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">
                    {t("password")} <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="form-user-pass"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-right focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">
                    {t("user_role")}
                  </label>
                  <select
                    id="form-user-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none"
                  >
                    <option value="cashier">{t("cashier_rule")}</option>
                    <option value="admin">{t("admin_rule")}</option>
                  </select>
                </div>

                <div className="pt-4 flex gap-3 justify-end items-center">
                  <button
                    id="form-user-cancel"
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-500 text-xs font-bold hover:bg-slate-50 transition"
                  >
                    {t("cancel")}
                  </button>

                  <button
                    id="form-user-submit"
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow hover:bg-blue-700 transition"
                  >
                    {t("add_btn")}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit User Modal */}
      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 text-right relative overflow-hidden border"
            >
              <div className="flex items-center justify-between border-b pb-3.5 mb-5">
                <button
                  id="user-edit-modal-close"
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
                <h3 className="text-md font-bold text-slate-850">
                  {language === "ar" ? "تعديل حساب المستخدم" : "Edit User Account"}
                </h3>
              </div>

              {errorMsg && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2 justify-end">
                  <span>{errorMsg}</span>
                  <CircleAlert className="w-4 h-4" />
                </div>
              )}

              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">
                    {t("user_real_name")} <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="edit-user-name"
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-right focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">
                    {t("user_login_name")} <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="edit-user-username"
                    type="text"
                    required
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-right focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">
                    {t("password")} <span className="text-slate-400 font-normal">({language === "ar" ? "اتركه فارغاً لعدم التغيير" : "leave blank to keep unchanged"})</span>
                  </label>
                  <input
                    id="edit-user-pass"
                    type="password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-right focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">
                    {t("user_role")}
                  </label>
                  <select
                    id="edit-user-role"
                    disabled={editingUser.id === "u-1"}
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as any)}
                    className={`w-full text-xs font-semibold px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none ${editingUser.id === "u-1" ? "opacity-60 cursor-not-allowed" : ""}`}
                  >
                    <option value="cashier">{t("cashier_rule")}</option>
                    <option value="admin">{t("admin_rule")}</option>
                  </select>
                </div>

                <div className="pt-4 flex gap-3 justify-end items-center">
                  <button
                    id="edit-user-cancel"
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-500 text-xs font-bold hover:bg-slate-50 transition"
                  >
                    {t("cancel")}
                  </button>

                  <button
                    id="edit-user-submit"
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow hover:bg-blue-700 transition"
                  >
                    {language === "ar" ? "حفظ التغييرات" : "Save Changes"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Alert Message Modal */}
      <AnimatePresence>
        {alertMsg && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 text-right relative overflow-hidden border"
            >
              <div className="flex flex-col items-center text-center gap-4 py-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 mb-2">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h3 className="text-md font-bold text-slate-800">
                  {language === "ar" ? "تنبيه النظام" : "System Notification"}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed px-4">
                  {alertMsg}
                </p>
              </div>

              <div className="pt-4 flex justify-center">
                <button
                  id="alert-ok-btn"
                  type="button"
                  onClick={() => setAlertMsg(null)}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow hover:bg-blue-700 transition cursor-pointer"
                >
                  {language === "ar" ? "حسنًا" : "OK"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Neumorphic Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteTargetId && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 text-right relative overflow-hidden border"
            >
              <div className="flex flex-col items-center text-center gap-4 py-3">
                <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-500 mb-2">
                  <Trash2 className="w-6 h-6" />
                </div>
                <h3 className="text-md font-bold text-slate-800">
                  {t("delete_confirm").split("؟")[0] + "؟"}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed px-4">
                  {t("delete_confirm")} - ({deleteTargetName})
                </p>
              </div>

              <div className="pt-4 flex gap-3 justify-center items-center">
                <button
                  id="delete-cancel-btn"
                  type="button"
                  onClick={() => {
                    setDeleteTargetId(null);
                    setDeleteTargetName("");
                  }}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-500 text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
                >
                  {t("cancel")}
                </button>

                <button
                  id="delete-confirm-btn"
                  type="button"
                  onClick={confirmDelete}
                  className="px-6 py-2.5 rounded-xl bg-red-600 text-white font-bold text-xs shadow hover:bg-red-700 transition cursor-pointer"
                >
                  {language === "ar" ? "حذف" : "Delete"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
