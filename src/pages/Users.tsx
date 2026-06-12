import { useStore } from "@/store";
import { useState } from "react";
import { motion } from "framer-motion";
import PageTransition from "@/components/PageTransition";
import Select, { MultiSelect } from "@/components/Select";
import {
  UserIcon,
  PlusUserIcon,
  CrownIcon,
  BriefcaseIcon,
  HardHatIcon,
  TrashIcon,
  PencilIcon,
} from "@/components/Icons";
import { Plus, X, Search } from "lucide-react";
import { format } from "date-fns";
import type { UserRole } from "@/store/types";
import { ROLE_LABELS } from "@/store/types";

const roleIcons: Record<UserRole, React.ReactNode> = {
  superadmin: <CrownIcon className="w-4 h-4 text-amber-500" />,
  manager: <BriefcaseIcon className="w-4 h-4 text-violet-500" />,
  engineer: <HardHatIcon className="w-4 h-4 text-sky-500" />,
};

const roleColors: Record<UserRole, string> = {
  superadmin: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  manager: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  engineer: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
};

export default function Users() {
  const { users, facilities, currentUser, addUser, updateUser, deleteUser, hasPermission } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "engineer" as UserRole,
    facilityIds: [] as string[],
    isActive: true,
    password: "",
  });

  const canManage = hasPermission("manage_users");

  const filtered = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const resetForm = () => {
    setForm({ name: "", email: "", role: "engineer", facilityIds: [], isActive: true, password: "" });
    setEditingUser(null);
  };

  const openEdit = (user: typeof users[0]) => {
    setForm({
      name: user.name,
      email: user.email,
      role: user.role,
      facilityIds: user.facilityIds,
      isActive: user.isActive,
      password: "",
    });
    setEditingUser(user.id);
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.email.trim()) return;
    if (!editingUser && form.password.length < 6) return;
    if (editingUser && form.password && form.password.length < 6) return;

    const { password, ...rest } = form;

    if (editingUser) {
      // Only send the password when the admin typed a new one.
      await updateUser(editingUser, password ? { ...rest, password } : rest);
    } else {
      await addUser({
        ...rest,
        password,
        avatar: form.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2),
      });
    }

    setShowModal(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (id === currentUser?.id) return;
    if (confirm("Are you sure you want to delete this user?")) {
      await deleteUser(id);
    }
  };

  if (!canManage) {
    return (
      <PageTransition>
        <div className="p-4 lg:p-6 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
              <UserIcon className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Access Denied</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">You don't have permission to manage users.</p>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="p-4 lg:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">{users.length} users registered</p>
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-all duration-200 shadow-md shadow-emerald-600/20 hover:shadow-lg hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4" />
            Add User
          </button>
        </div>

        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-2 max-w-md">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users..."
            className="bg-transparent border-none outline-none text-sm text-gray-700 dark:text-gray-300 w-full"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((user, i) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-gray-900/50 transition-all duration-300"
            >
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                  {user.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">{user.name}</h3>
                    {user.id === currentUser?.id && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 font-semibold">YOU</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                </div>
                {!user.isActive && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400 font-semibold">INACTIVE</span>
                )}
              </div>

              <div className="mt-4 flex items-center gap-2">
                {roleIcons[user.role]}
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${roleColors[user.role]}`}>
                  {ROLE_LABELS[user.role]}
                </span>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between text-[10px] text-gray-400">
                  <span>Last login: {user.lastLogin ? format(new Date(user.lastLogin), "MMM d, h:mm a") : "Never"}</span>
                  <span>{user.facilityIds.length} facilities</span>
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => openEdit(user)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  <PencilIcon className="w-3 h-3" />
                  Edit
                </button>
                {user.id !== currentUser?.id && (
                  <button
                    onClick={() => handleDelete(user.id)}
                    className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-medium hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                  >
                    <TrashIcon className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => { setShowModal(false); resetForm(); }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6 z-10"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                    <PlusUserIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {editingUser ? "Edit User" : "Add User"}
                  </h3>
                </div>
                <button
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Full Name</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="John Smith"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="john@company.com"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    {editingUser ? "New Password (leave blank to keep current)" : "Password"}
                  </label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder={editingUser ? "••••••••" : "Min. 6 characters"}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  />
                  {!editingUser && form.password.length > 0 && form.password.length < 6 && (
                    <p className="mt-1 text-[10px] text-red-500">Password must be at least 6 characters</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Role</label>
                  <Select
                    value={form.role}
                    onChange={(v) => setForm({ ...form, role: v as UserRole })}
                    options={[
                      { value: "superadmin", label: "Super Admin", icon: <CrownIcon className="w-4 h-4 text-amber-500" /> },
                      { value: "manager", label: "Manager", icon: <BriefcaseIcon className="w-4 h-4 text-violet-500" /> },
                      { value: "engineer", label: "Field Engineer", icon: <HardHatIcon className="w-4 h-4 text-sky-500" /> },
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Assigned Facilities</label>
                  <MultiSelect
                    values={form.facilityIds}
                    onChange={(v) => setForm({ ...form, facilityIds: v })}
                    options={facilities.map((f) => ({ value: f.id, label: f.name }))}
                    placeholder="Select facilities..."
                  />
                </div>

                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Active Status</p>
                    <p className="text-xs text-gray-400">User can log in when active</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, isActive: !form.isActive })}
                    className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${form.isActive ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"}`}
                  >
                    <motion.div
                      className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md"
                      animate={{ left: form.isActive ? "26px" : "2px" }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  </button>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-all shadow-md shadow-emerald-600/20"
                >
                  {editingUser ? "Save Changes" : "Add User"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
