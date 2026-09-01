import React from "react";

export const MedicalDisclaimerBanner: React.FC = () => {
  return (
    <div aria-label="Medical Disclaimer" className="bg-teal-50 border-b border-teal-100 py-1.5 px-4 text-center flex-shrink-0">
      <p className="text-[11px] text-teal-700">
        ℹ️ WellBridge AI helps you understand medical terminology. It does not replace professional medical advice. Always consult your physician.
      </p>
    </div>
  );
};
