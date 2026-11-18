'use client';

import { useState } from 'react';
import Image from 'next/image';
import { loginOfficer } from './actions';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    setErrorMessage(null);
    
    const response = await loginOfficer(formData);
    
    if (response?.error) {
      setErrorMessage(response.error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center lg:justify-end p-6 lg:pr-32 overflow-hidden">
      
      {/* Full Screen Background Image */}
      <div className="absolute inset-0 z-0">
        <Image 
          src="/bg-login.png" 
          alt="Background" 
          fill 
          className="object-cover object-center"
          priority
        />
        {/* Optional subtle overlay to ensure the glass stands out */}
        <div className="absolute inset-0 bg-black/10 mix-blend-multiply" />
      </div>

      {/* Glassmorphism Login Card */}
      <div className="relative z-10 w-full max-w-md bg-white/60 backdrop-blur-2xl border border-white/50 shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] rounded-[2rem] p-8 sm:p-10">
        
        {/* Header & Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative w-24 h-24 mb-4 drop-shadow-md">
            <Image 
              src="/logo-mdr.png" 
              alt="Logo Majlis Daerah Raub" 
              fill 
              className="object-contain" 
              priority
            />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight text-center">Sistem Stor MDR</h1>
          <p className="text-[#5138a1] text-sm mt-1 font-bold tracking-wide uppercase">Portal Pegawai</p>
        </div>

        {errorMessage && (
          <div className="bg-red-50/90 backdrop-blur-sm border-l-4 border-red-500 text-red-700 p-4 rounded-xl mb-6 text-sm font-medium shadow-sm">
            {errorMessage}
          </div>
        )}

        <form action={handleSubmit} className="space-y-5">
          {/* Username / Email Input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <FeatherUserIcon className="h-5 w-5 text-gray-500" />
            </div>
            <input
              type="email"
              name="email"
              className="w-full pl-11 pr-4 py-3.5 border border-white/60 bg-white/50 backdrop-blur-md rounded-2xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#5138a1] focus:bg-white/80 transition-all font-medium shadow-inner"
              placeholder="E-mel Rasmi"
              required
            />
          </div>

          {/* Password Input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <FeatherLockIcon className="h-5 w-5 text-gray-500" />
            </div>
            <input
              type="password"
              name="password"
              className="w-full pl-11 pr-12 py-3.5 border border-white/60 bg-white/50 backdrop-blur-md rounded-2xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#5138a1] focus:bg-white/80 transition-all font-medium shadow-inner"
              placeholder="Kata Laluan"
              required
            />
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
              <FeatherEyeOffIcon className="h-4 w-4 text-gray-400" />
            </div>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#5138a1]/90 hover:bg-[#432b85] backdrop-blur-md text-white font-bold py-4 px-4 rounded-2xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex justify-center items-center gap-3 disabled:opacity-70 disabled:hover:translate-y-0 mt-8 border border-white/20"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Menyemak...
              </>
            ) : (
              <>
                Log Masuk
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </>
            )}
          </button>
        </form>
        
      </div>
    </div>
  );
}

const FeatherUserIcon = ({ className }: { className: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const FeatherLockIcon = ({ className }: { className: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

const FeatherEyeOffIcon = ({ className }: { className: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
  </svg>
);