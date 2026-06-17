import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingIndicator } from "@/components/ui/loading-indicator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import banner from "@/assets/logo.png";

export default function Register() {
  const navigate = useNavigate();
  const { register, isLoading, error, clearError } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    requestedRole: "manajemen",
    requestedKstIdentifier: "ngijo",
  });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (error) clearError();
    if (validationErrors[name]) {
      setValidationErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = "Nama harus diisi";
    }
    if (!formData.username.trim()) {
      errors.username = "Username harus diisi";
    }

    if (!formData.email.trim()) {
      errors.email = "Email harus diisi";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Email tidak valid";
    }

    if (!formData.password) {
      errors.password = "Password harus diisi";
    } else if (formData.password.length < 8) {
      errors.password = "Password minimal 8 karakter";
    }

    if (
      formData.requestedRole === "operator" &&
      !formData.requestedKstIdentifier
    ) {
      errors.requestedKstIdentifier = "Operator wajib memilih satu KST";
    }

    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = "Password tidak sesuai";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        name: formData.name,
        requestedRole: formData.requestedRole as "manajemen" | "operator",
        requestedKstIdentifier:
          formData.requestedRole === "operator"
            ? (formData.requestedKstIdentifier as
              | "ngijo"
              | "cangar"
              | "jatikerto")
            : null,
      });
      setSuccessMessage(
        "Registrasi berhasil dikirim. Akun menunggu approval super admin.",
      );
      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      // Error sudah di-set di context
      console.error("Registration failed:", err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Section - Branding KST */}
      <div className="hidden lg:flex lg:w-1/2 bg-blue-50 items-center justify-center p-8">
        <div className="flex flex-col items-center max-w-lg text-center">
          <div className="w-64 h-64 bg-white/70 shadow-sm rounded-2xl flex items-center justify-center mb-8 overflow-hidden">
            <div className="w-64 h-64 rounded-2xl bg-white/70 shadow-sm flex items-center justify-center mb-8 mx-auto overflow-hidden">
              <img src={banner} alt="KST DIKST" className="object-cover" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            Bergabung dengan KST
          </h1>
          <p className="text-gray-600">
            Buat akun untuk memulai akses ke sistem KST
          </p>
        </div>
      </div>

      {/* Right Section - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-md">
          <div className="p-8">
            {/* Logo Mobile */}
            <div className="lg:hidden mb-8">
              <div className="w-12 h-12 bg-gray-300 rounded-lg flex items-center justify-center mx-auto mb-6">
                <span className="text-gray-500 text-xs">KST</span>
              </div>
            </div>

            {/* Header */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-green-600 mb-2">
                Daftar Akun KST
              </h2>
              <p className="text-gray-600">
                Buat akun untuk mulai menggunakan dashboard KST
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
            {successMessage && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-md">
                <p className="text-sm text-emerald-700">{successMessage}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nama Lengkap*
                </label>
                <Input
                  type="text"
                  name="name"
                  placeholder="Masukkan nama lengkap"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full"
                  disabled={isLoading}
                />
                {validationErrors.name && (
                  <p className="text-xs text-red-600 mt-1">
                    {validationErrors.name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username KST*
                </label>
                <Input
                  type="text"
                  name="username"
                  placeholder="Masukkan username"
                  value={formData.username}
                  onChange={handleChange}
                  className="w-full"
                  disabled={isLoading}
                />
                {validationErrors.username && (
                  <p className="text-xs text-red-600 mt-1">
                    {validationErrors.username}
                  </p>
                )}
              </div>

              {/* Email Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email KST*
                </label>
                <Input
                  type="email"
                  name="email"
                  placeholder="Masukkan email KST"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full"
                  disabled={isLoading}
                />
                {validationErrors.email && (
                  <p className="text-xs text-red-600 mt-1">
                    {validationErrors.email}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Peran yang diajukan*
                </label>
                <Select
                  value={formData.requestedRole}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, requestedRole: value }))
                  }
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manajemen">Manajemen</SelectItem>
                    <SelectItem value="operator">Operator</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.requestedRole === "operator" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    KST yang ditugaskan*
                  </label>
                  <Select
                    value={formData.requestedKstIdentifier}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        requestedKstIdentifier: value,
                      }))
                    }
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ngijo">KST Ngijo</SelectItem>
                      <SelectItem value="cangar">KST Cangar</SelectItem>
                      <SelectItem value="jatikerto">KST Jatikerto</SelectItem>
                    </SelectContent>
                  </Select>
                  {validationErrors.requestedKstIdentifier && (
                    <p className="text-xs text-red-600 mt-1">
                      {validationErrors.requestedKstIdentifier}
                    </p>
                  )}
                </div>
              )}

              {/* Password Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kata sandi*
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="Masukkan kata sandi"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full pr-10"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-600 hover:text-gray-900"
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <FaEyeSlash size={18} />
                    ) : (
                      <FaEye size={18} />
                    )}
                  </button>
                </div>
                {validationErrors.password && (
                  <p className="text-xs text-red-600 mt-1">
                    {validationErrors.password}
                  </p>
                )}
              </div>

              {/* Confirm Password Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Konfirmasi kata sandi*
                </label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    placeholder="Konfirmasi kata sandi"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full pr-10"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-gray-600 hover:text-gray-900"
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? (
                      <FaEyeSlash size={18} />
                    ) : (
                      <FaEye size={18} />
                    )}
                  </button>
                </div>
                {validationErrors.confirmPassword && (
                  <p className="text-xs text-red-600 mt-1">
                    {validationErrors.confirmPassword}
                  </p>
                )}
              </div>

              {/* Register Button */}
              <Button
                type="submit"
                className="w-full bg-black text-white hover:bg-gray-800 mt-6"
                disabled={isLoading}
              >
                {isLoading ? <LoadingIndicator label="Sedang membuat akun" className="text-white" iconClassName="text-white" /> : "Daftar"}
              </Button>
            </form>

            {/* Login Link */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-700">
                Sudah punya akun?{" "}
                <Link
                  to="/login"
                  className="text-gray-900 hover:underline font-medium"
                >
                  Masuk
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
