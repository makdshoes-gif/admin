import React from 'react';
import { useStore } from '../../context/StoreContext';
import { MakdLogo } from './MakdLogo';
import {
  User,
  ShieldCheck,
  Building,
  Key,
  Calendar,
  CheckCircle2,
  X,
  LogOut,
  Sparkles,
  Database,
  DollarSign
} from 'lucide-react';

interface UserWindowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestAdmin?: () => void;
}

export const UserWindowModal: React.FC<UserWindowModalProps> = ({ isOpen, onClose, onRequestAdmin }) => {
  const { userRole, setUserRole, exchangeRate, bcvInfo } = useStore();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
        {/* Header with Brand Logo */}
        <div className="bg-slate-900 text-white p-6 relative flex flex-col items-center justify-center text-center border-b border-slate-800">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-md transition"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Official MAKD Logo */}
          <div className="bg-white p-2.5 rounded-xl shadow-lg border border-slate-700/80 mb-3">
            <MakdLogo size={68} showSlogan={true} />
          </div>

          <h2 className="text-base font-bold tracking-tight text-white uppercase">
            Ventana de Usuario
          </h2>
          <p className="text-xs text-slate-400">
            MAKD SHOP • marcamos tu estilo
          </p>
        </div>

        {/* User Profile Details */}
        <div className="p-6 space-y-5">
          {/* User ID Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-sm border border-indigo-200">
                {userRole === 'admin' ? 'AR' : 'CJ'}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {userRole === 'admin' ? 'Alejandra Rodríguez' : 'Cajera de Turno'}
                </h3>
                <p className="text-xs text-slate-500 flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="font-semibold text-indigo-700 uppercase">
                    {userRole === 'admin' ? 'Administrador General' : 'Operador de Ventas'}
                  </span>
                </p>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Sesión Activa
            </span>
          </div>

          {/* Location & Context */}
          <div className="space-y-2 text-xs text-slate-600">
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="flex items-center space-x-2 text-slate-500">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                <span>Boutique / Sucursal:</span>
              </span>
              <span className="font-semibold text-slate-800">Puerto Ordaz - Alta Vista II (Local 163)</span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="flex items-center space-x-2 text-slate-500">
                <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                <span>Tasa Oficial BCV:</span>
              </span>
              <span className="font-bold text-slate-900 font-mono">
                {exchangeRate.toFixed(2)} Bs/USD
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="flex items-center space-x-2 text-slate-500">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                <span>Seguridad:</span>
              </span>
              <span className="font-semibold text-slate-800">Protegido con PIN (4 dígitos)</span>
            </div>
          </div>

          {/* Role Switching */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Cambiar Rol de Sesión
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  if (userRole !== 'admin') {
                    onClose();
                    if (onRequestAdmin) onRequestAdmin();
                    else setUserRole('admin');
                  }
                }}
                className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center space-y-1 transition cursor-pointer ${
                  userRole === 'admin'
                    ? 'bg-indigo-50/70 border-indigo-500 text-indigo-900 ring-2 ring-indigo-500/20 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ShieldCheck className={`w-4 h-4 ${userRole === 'admin' ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span>Administrador</span>
                <span className="text-[10px] text-slate-400 font-normal">Requiere PIN</span>
              </button>

              <button
                type="button"
                onClick={() => setUserRole('cajera')}
                className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center space-y-1 transition cursor-pointer ${
                  userRole === 'cajera'
                    ? 'bg-indigo-50/70 border-indigo-500 text-indigo-900 ring-2 ring-indigo-500/20 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <User className={`w-4 h-4 ${userRole === 'cajera' ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span>Cajera</span>
                <span className="text-[10px] text-slate-400 font-normal">Punto de venta</span>
              </button>
            </div>
          </div>

          {/* Footer Close Button */}
          <div className="pt-2">
            <button
              onClick={onClose}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
            >
              Listo / Volver a la Tienda
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
