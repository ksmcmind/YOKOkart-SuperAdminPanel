// src/pages/Login.jsx
import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { sendOtp, verifyOtp, selectOtpSent, selectAuthLoading, selectAuthError, clearError } from '../store/slices/authSlice'
import Button from '../components/Button'
import Input  from '../components/Input'

export default function Login() {
  const dispatch = useDispatch()
  const otpSent  = useSelector(selectOtpSent)
  const loading  = useSelector(selectAuthLoading)
  const error    = useSelector(selectAuthError)

  const [phone, setPhone] = useState('')
  const [otp,   setOtp]   = useState('')

  const handleSendOtp = () => {
    if (phone.length !== 10) return
    dispatch(clearError())
    dispatch(sendOtp(phone))
  }

  const handleVerify = () => {
    if (otp.length !== 6) return
    dispatch(clearError())
    dispatch(verifyOtp({ phone, otp }))
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-500 rounded-2xl mb-4">
            <span className="text-white text-3xl font-bold">K</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">KSMCM</h1>
          <p className="text-gray-500 text-sm mt-1">Super Admin Panel</p>
        </div>

        {/* Card */}
        <div className="card p-6">
          {!otpSent ? (
            <>
              <h2 className="text-base font-semibold text-gray-900 mb-4">Login to your account</h2>
              <div className="form-group">
                <label className="label">Phone Number <span className="text-red-500">*</span></label>
                <div className="flex gap-2">
                  <div className="input w-16 text-center bg-gray-50 text-gray-500 flex-shrink-0 flex items-center justify-center text-sm">
                    +91
                  </div>
                  <input
                    className="input flex-1"
                    placeholder="9876543210"
                    value={phone}
                    maxLength={10}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
                  />
                </div>
              </div>
              {error && <p className="text-red-500 text-xs mb-3">{error}</p>}
              <Button
                variant="primary"
                className="w-full"
                loading={loading}
                onClick={handleSendOtp}
                disabled={phone.length !== 10}
              >
                Send OTP
              </Button>
            </>
          ) : (
            <>
              <h2 className="text-base font-semibold text-gray-900 mb-1">Enter OTP</h2>
              <p className="text-xs text-gray-400 mb-4">Sent to +91 {phone}</p>
              <div className="form-group">
                <label className="label">6-digit OTP</label>
                <input
                  className="input text-center text-2xl tracking-[0.5em] font-mono"
                  placeholder="000000"
                  value={otp}
                  maxLength={6}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  onKeyDown={e => e.key === 'Enter' && handleVerify()}
                  autoFocus
                />
              </div>
              {error && <p className="text-red-500 text-xs mb-3">{error}</p>}
              <Button
                variant="primary"
                className="w-full mb-2"
                loading={loading}
                onClick={handleVerify}
                disabled={otp.length !== 6}
              >
                Login
              </Button>
              <Button
                variant="secondary"
                className="w-full text-xs"
                onClick={() => { setOtp(''); dispatch(clearError()) }}
              >
                ← Change number
              </Button>
            </>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Super Admin access only
        </p>
      </div>
    </div>
  )
}