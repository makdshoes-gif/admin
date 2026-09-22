import React, { useState, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { MakdLogo } from '../common/MakdLogo';
import {
  User,
  ShieldCheck,
  ShoppingCart,
  Building,
  KeyRound,
  ArrowRight,
  Sparkles,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  Clock,
  MapPin,
  RefreshCw,
  Eye,
  EyeOff,
  Coins
} from 'lucide-react';
import { UserRole } from '../../types';

export const LoginPage: React.FC = () => {
  const {
    loginSession,
    exchangeRate,
    bcvInfo,
    adminPin,
    cajeraPin,
  } = useStore();

  const [selectedRole, setSelectedRole] = useState<UserRole>('cajera');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isShaking, setIsShaking] = useState(false);

  // Clear PIN and error when role changes
  useEffect(() => {
    setPin('');
    setErrorMessage('');
  }, [selectedRole]);

  const handleKeyPress = (digit: string) => {
    if (pin.length < 4) {
      setPin((prev) => prev + digit);
      setErrorMessage('');
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setErrorMessage('');
  };

  const handleClear = () => {
    setPin('');
    setErrorMessage('');
  };

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (pin.length === 0) {
      setErrorMessage('Por favor ingresa la clave de 4 dígitos');
      triggerShake();
      return;
    }

    const success = loginSession(selectedRole, pin);
    if (!success) {
      setErrorMessage(
        selectedRole === 'admin'
          ? 'Clave de Administrador incorrecta (Predeterminada: 1234)'
          : 'Clave de Cajera incorrecta (Predeterminada: 0000)'
      );
      triggerShake();
      setPin('');
    }
  };

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleKeyPress(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Enter') {
        handleLogin();
      } else if (e.key === 'Escape') {
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, selectedRole]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between text-slate-100 selection:bg-indigo-600 selection:text-white relative overflow-hidden">
      {/* Background Subtle Ambient Glow */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Bar */}
      <header className="relative z-10 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-1 shadow-md border border-slate-700 shrink-0">
            <MakdLogo size={36} showSlogan={false} />
          </div>
          <div>
            <span className="text-white font-black tracking-tight uppercase text-sm block leading-none">
              MAKD SHOP
            </span>
            <span className="text-[10px] text-slate-400 font-medium italic block mt-1">
              marcamos tu estilo • Zapatería & Streetwear
            </span>
          </div>
        </div>

        {/* BCV Tasa Badge + Location */}
        <div className="flex items-center space-x-3 sm:space-x-4 text-xs">
          <div className="hidden sm:flex items-center space-x-1.5 text-slate-400">
            <MapPin className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-[11px]">Alta Vista II (Local 163) • Puerto Ordaz</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/90 border border-slate-700/80 text-xs text-slate-300">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-semibold text-slate-400 text-[11px]">BCV:</span>
            <span className="font-mono font-bold text-white">{exchangeRate.toFixed(2)}</span>
            <span className="text-slate-400 text-[10px]">Bs/$</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="max-w-4xl w-full space-y-6">
          
          {/* Welcome Title */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-1">
              <Lock className="w-3.5 h-3.5" />
              <span>Portal de Control de Acceso</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Bienvenido a MAKD SHOP
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
              Selecciona tu rol de usuario e ingresa la clave de 4 dígitos para abrir turno o acceder a la administración.
            </p>
          </div>

          {/* Role Selection Cards & PIN Terminal */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
            
            {/* Left: Role Selection Cards (5 cols) */}
            <div className="md:col-span-5 flex flex-col gap-3">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
                1. Selecciona tu Perfil
              </span>

              {/* Cajera Card */}
              <button
                type="button"
                onClick={() => setSelectedRole('cajera')}
                className={`w-full p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between relative ${
                  selectedRole === 'cajera'
                    ? 'bg-slate-900 border-indigo-500 shadow-lg shadow-indigo-500/10 ring-2 ring-indigo-500/30'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80 text-slate-400'
                }`}
              >
                {selectedRole === 'cajera' && (
                  <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                )}
                <div className="flex items-center space-x-3 mb-2.5">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      selectedRole === 'cajera'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <span>Cajera / Punto de Venta</span>
                    </h3>
                    <span className="text-[10px] text-indigo-400 font-semibold uppercase">
                      Turno Operativo
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed mb-3">
                  Facturación de calzado, registro de clientes, apartados, verificación Pago Móvil BDV y arqueo diario.
                </p>
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Clave Predeterminada:</span>
                  <span className="font-mono font-bold text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/40">
                    0000
                  </span>
                </div>
              </button>

              {/* Admin Card */}
              <button
                type="button"
                onClick={() => setSelectedRole('admin')}
                className={`w-full p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between relative ${
                  selectedRole === 'admin'
                    ? 'bg-slate-900 border-indigo-500 shadow-lg shadow-indigo-500/10 ring-2 ring-indigo-500/30'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80 text-slate-400'
                }`}
              >
                {selectedRole === 'admin' && (
                  <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                )}
                <div className="flex items-center space-x-3 mb-2.5">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      selectedRole === 'admin'
                        ? 'bg-slate-800 text-indigo-400 border border-indigo-500/40'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    <ShieldCheck className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <span>Administrador General</span>
                    </h3>
                    <span className="text-[10px] text-emerald-400 font-semibold uppercase">
                      Gerencia & Finanzas
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed mb-3">
                  Control total de inventario, compras de divisas, costos, reportes de utilidades y conciliación bancaria/Cashea.
                </p>
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Clave Predeterminada:</span>
                  <span className="font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                    1234
                  </span>
                </div>
              </button>
            </div>

            {/* Right: Interactive PIN Keypad Terminal (7 cols) */}
            <div className="md:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col justify-between">
              
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      2. Ingresa la Clave de Seguridad
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400">
                    Perfil:{' '}
                    <strong className="text-indigo-400 uppercase">
                      {selectedRole === 'admin' ? 'Administrador' : 'Cajera'}
                    </strong>
                  </span>
                </div>

                {/* PIN Display Dots */}
                <div className="space-y-2">
                  <div
                    className={`bg-slate-950 border rounded-2xl p-4 flex flex-col items-center justify-center transition-all ${
                      errorMessage
                        ? 'border-rose-500/80 bg-rose-950/20'
                        : 'border-slate-800 focus-within:border-indigo-500'
                    } ${isShaking ? 'animate-bounce' : ''}`}
                  >
                    <div className="flex items-center gap-4 py-2">
                      {[0, 1, 2, 3].map((index) => {
                        const hasDigit = pin.length > index;
                        return (
                          <div
                            key={index}
                            className={`w-4 h-4 rounded-full transition-all duration-150 ${
                              hasDigit
                                ? 'bg-indigo-500 scale-110 shadow-sm shadow-indigo-500/50'
                                : 'border-2 border-slate-700 bg-slate-900'
                            }`}
                          />
                        );
                      })}
                    </div>

                    {/* Numeric Preview for Clarity */}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-mono text-slate-500 tracking-widest">
                        {showPin ? pin || '••••' : '•'.repeat(pin.length) || '••••'}
                      </span>
                      {pin.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowPin(!showPin)}
                          className="text-slate-500 hover:text-slate-300 p-0.5 cursor-pointer"
                          title={showPin ? 'Ocultar dígitos' : 'Mostrar dígitos'}
                        >
                          {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Error Message */}
                  {errorMessage && (
                    <div className="text-xs text-rose-400 font-semibold flex items-center justify-center gap-1.5 py-1 animate-in fade-in">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{errorMessage}</span>
                    </div>
                  )}
                </div>

                {/* Keypad Grid (3x4) */}
                <div className="grid grid-cols-3 gap-2.5 max-w-xs mx-auto">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                    <button
                      key={digit}
                      type="button"
                      onClick={() => handleKeyPress(digit)}
                      className="h-12 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-white font-bold text-lg border border-slate-700/60 active:scale-95 transition-all shadow-xs cursor-pointer flex items-center justify-center"
                    >
                      {digit}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={handleClear}
                    className="h-12 rounded-xl bg-slate-950/80 hover:bg-slate-800 text-slate-400 hover:text-rose-400 font-semibold text-xs border border-slate-800 active:scale-95 transition cursor-pointer flex items-center justify-center"
                  >
                    Borrar
                  </button>

                  <button
                    type="button"
                    onClick={() => handleKeyPress('0')}
                    className="h-12 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-white font-bold text-lg border border-slate-700/60 active:scale-95 transition-all shadow-xs cursor-pointer flex items-center justify-center"
                  >
                    0
                  </button>

                  <button
                    type="button"
                    onClick={handleBackspace}
                    className="h-12 rounded-xl bg-slate-950/80 hover:bg-slate-800 text-slate-400 hover:text-white font-semibold text-xs border border-slate-800 active:scale-95 transition cursor-pointer flex items-center justify-center"
                  >
                    ⌫
                  </button>
                </div>
              </div>

              {/* Submit CTA Button */}
              <div className="pt-4 border-t border-slate-800 mt-4">
                <button
                  type="button"
                  onClick={() => handleLogin()}
                  disabled={pin.length < 4}
                  className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg ${
                    pin.length === 4
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/40'
                  }`}
                >
                  <Unlock className="w-4 h-4" />
                  <span>
                    Ingresar como {selectedRole === 'admin' ? 'Administrador' : 'Cajera'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </div>

          </div>

        </div>
      </main>

      {/* Footer Info */}
      <footer className="relative z-10 border-t border-slate-900 bg-slate-950/80 px-4 py-3 text-center text-[11px] text-slate-500">
        <span>MAKD SHOP POS • Sistema Seguro de Facturación & Control de Inventario de Calzado • Puerto Ordaz</span>
      </footer>
    </div>
  );
};
