import { Settings } from 'lucide-react';

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-[#111417] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-[#1C232B] border border-[#262B2F] flex items-center justify-center mx-auto">
          <Settings className="w-8 h-8 text-[#949599] animate-spin" style={{ animationDuration: '3s' }} />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-[#EFEFF1]">Under Maintenance</h1>
          <p className="text-[#949599] leading-relaxed">
            We are currently performing scheduled maintenance to improve your experience.
            We will be back shortly.
          </p>
        </div>
        <div className="pt-4 border-t border-[#262B2F]">
          <p className="text-xs text-[#6B7278]">
            If this persists, contact us at{' '}
            <a href="mailto:support@tribesandcliqs.com" className="text-[#949599] hover:text-white transition underline">
              support@tribesandcliqs.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
