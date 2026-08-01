'use client'

import React from 'react'
import Link from 'next/link'
import { Button } from '@/app/components/ui/button'

function TermsAndConditions() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans">
      <div className="max-w-4xl mx-auto px-6 py-16 md:py-24">
        <Link href="/" className="inline-flex items-center text-sm font-semibold text-zinc-500 hover:text-zinc-900 transition-colors mb-12">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Home
        </Link>
        
        <div className="bg-white rounded-[32px] p-8 md:p-16 shadow-sm border border-zinc-200">
          <div className="mb-12">
            <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4 text-brand-charcoal">
              Terms and Conditions
            </h1>
            <p className="text-zinc-500 text-lg">
              Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>

          <div className="prose prose-zinc max-w-none prose-headings:font-bold prose-headings:text-brand-charcoal prose-p:text-zinc-600 prose-a:text-brand-forest">
            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4">1. Introduction</h2>
              <p className="text-zinc-600 mb-4 leading-relaxed">
                Welcome to ConnexLink. These Terms and Conditions govern your use of our website and services. By accessing or using ConnexLink, you agree to be bound by these terms. If you disagree with any part of these terms, you may not access our service.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4">2. User Accounts</h2>
              <p className="text-zinc-600 mb-4 leading-relaxed">
                When you create an account with us, you must provide information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service.
              </p>
              <p className="text-zinc-600 mb-4 leading-relaxed">
                You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password, whether your password is with our Service or a third-party service.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4">3. Intellectual Property</h2>
              <p className="text-zinc-600 mb-4 leading-relaxed">
                The Service and its original content, features, and functionality are and will remain the exclusive property of ConnexLink and its licensors. The Service is protected by copyright, trademark, and other laws of both the United States and foreign countries.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4">4. Links to Other Web Sites</h2>
              <p className="text-zinc-600 mb-4 leading-relaxed">
                Our Service may contain links to third-party web sites or services that are not owned or controlled by ConnexLink. We have no control over, and assume no responsibility for, the content, privacy policies, or practices of any third-party web sites or services.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4">5. Limitation of Liability</h2>
              <p className="text-zinc-600 mb-4 leading-relaxed">
                In no event shall ConnexLink, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.
              </p>
            </section>
            
            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4">6. Changes</h2>
              <p className="text-zinc-600 mb-4 leading-relaxed">
                We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will try to provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4">7. Contact Us</h2>
              <p className="text-zinc-600 leading-relaxed">
                If you have any questions about these Terms, please contact us at <a href="mailto:support@connexlink.com" className="text-brand-forest hover:underline font-semibold">support@connexlink.com</a>.
              </p>
            </section>
          </div>
          
          <div className="mt-16 pt-8 border-t border-zinc-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-zinc-500 text-sm">
              &copy; {new Date().getFullYear()} ConnexLink. All rights reserved.
            </p>
            <Button 
              className="bg-brand-forest hover:bg-brand-forest/90 text-white rounded-full px-8 py-6 text-base font-bold transition-all shadow-md"
              onClick={() => window.history.back()}
            >
              I Understand
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TermsAndConditions
