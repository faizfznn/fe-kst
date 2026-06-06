import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import banner from "@/assets/logo.png";

export default function Login() {
  const navigate = useNavigate();
  const { login, isLoading, error, clearError } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (error) clearError();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(formData.email, formData.password);
      navigate("/dashboard");
    } catch (err) {
      // Error sudah di-set di context
      console.error("Login failed:", err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Section - Branding KST */}
      <div className="hidden lg:flex lg:w-1/2 bg-blue-50 items-center justify-center p-8">
        <div className="text-center max-w-lg">
          <div className="w-64 h-64 rounded-2xl bg-white/70 shadow-sm flex items-center justify-center mb-8 mx-auto overflow-hidden">
            <img src={banner} alt="KST DIKST" className="object-cover" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            Selamat datang kembali di KST
          </h1>
          <p className="text-gray-600">
            Masuk ke akun Anda untuk melanjutkan ke dashboard KST
          </p>
        </div>
      </div>

      {/* Right Section - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-md">
          <div className="p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-green-600 mb-2">
                MASUK AKUN KST
              </h2>
              <p className="text-gray-600">
                Masuk ke akun Anda untuk mengakses dashboard KST
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
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
                  required
                  className="w-full"
                  disabled={isLoading}
                />
              </div>

              {/* Password Input */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Kata sandi*
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs text-gray-600 hover:text-gray-900 underline"
                  >
                    Lupa kata sandi?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="Masukkan kata sandi"
                    value={formData.password}
                    onChange={handleChange}
                    required
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
              </div>

              {/* Login Button */}
              <Button
                type="submit"
                className="w-full bg-black text-white hover:bg-gray-800 mt-6"
                disabled={isLoading || !formData.email.trim() || !formData.password.trim()}
              >
                {isLoading ? "Sedang masuk..." : "Masuk"}
              </Button>
            </form>

            {/* Register Link */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-700">
                Belum punya akun?{" "}
                <Link
                  to="/register"
                  className="text-gray-900 hover:underline font-medium"
                >
                  Daftar
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
