'use client'

import React from 'react'
import { Button } from '@/app/components/ui/button'

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TermsModal({ isOpen, onClose }: TermsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm transition-opacity">
      <div 
        className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 md:px-8 md:py-6 border-b border-zinc-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur z-10">
          <div>
            <h2 className="text-2xl font-black text-brand-charcoal">Terms and Conditions</h2>
            <p className="text-sm text-zinc-500 mt-1">
              Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 md:p-8 overflow-y-auto">
          <div className="prose prose-sm md:prose-base prose-zinc max-w-none prose-headings:font-bold prose-headings:text-brand-charcoal prose-p:text-zinc-600">
            <section className="mb-8">
              <h3 className="text-lg font-bold mb-2">1. Introduction</h3>
              <p className="mb-4">
                Welcome to ConnexLink. These Terms and Conditions govern your use of our website and services. By accessing or using ConnexLink, you agree to be bound by these terms. If you disagree with any part of these terms, you may not access our service.
              </p>
            </section>

            <section className="mb-8">
              <h3 className="text-lg font-bold mb-2">2. User Accounts</h3>
              <p className="mb-4">
                When you create an account with us, you must provide information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service.
              </p>
              <p className="mb-4">
                You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password.
              </p>
            </section>

            <section className="mb-8">
              <h3 className="text-lg font-bold mb-2">3. Intellectual Property</h3>
              <p className="mb-4">
                The Service and its original content, features, and functionality are and will remain the exclusive property of ConnexLink and its licensors. The Service is protected by copyright, trademark, and other laws.
              </p>
            </section>

            <section className="mb-8">
              <h3 className="text-lg font-bold mb-2">4. Limitation of Liability</h3>
              <p className="mb-4">
                In no event shall ConnexLink, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages resulting from your access to or use of or inability to access or use the Service.
              </p>
            </section>
            
            <section className="mb-4">
              <h3 className="text-lg font-bold mb-2">5. Changes</h3>
              <p className="mb-4">
                We reserve the right, at our sole discretion, to modify or replace these Terms at any time. What constitutes a material change will be determined at our sole discretion.
              </p>
            </section>
          </div>
        </div>

        <div className="p-5 md:p-6 border-t border-zinc-100 bg-zinc-50/50 flex justify-end shrink-0">
          <Button 
            onClick={onClose}
            className="bg-brand-forest hover:bg-brand-forest/90 text-white rounded-full px-8 h-12 text-base font-bold shadow-sm transition-all"
          >
            I Agree
          </Button>
        </div>
      </div>
    </div>
  )
}
