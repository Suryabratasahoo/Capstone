'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'

function ForgotPassword() {
    return (
        <div className="h-screen flex w-full font-sans bg-white overflow-hidden">
            {/* Left Section - Forgot Password Form */}
            <div className="w-full lg:w-[50%] h-full overflow-y-auto flex flex-col justify-center items-center px-8 sm:px-16 md:px-24 py-12">
                <div className="w-full max-w-[480px]">
                    {/* Logo Placeholder */}
                    <div className="mt-10 mb-10 text-2xl font-black tracking-tighter">
                        connex<span className="text-brand-forest">link</span>
                    </div>

                    <h1 className="text-[40px] font-black leading-tight tracking-[-0.03em] text-zinc-900 mb-2">
                        Reset password
                    </h1>
                    <p className="text-zinc-500 mb-10 text-base">
                        Enter your email address and we'll send you a link to reset your password.
                    </p>

                    <form className="space-y-4">
                        <div className="space-y-4">
                            <div>
                                <Input
                                    type="text"
                                    placeholder="Email"
                                    className="h-14 px-4 bg-zinc-100/80 border border-gray-400 border-2 focus-visible:bg-white focus-visible:border-zinc-900 focus-visible:ring-0 rounded-2xl text-base placeholder:text-zinc-500 text-zinc-900 font-medium"
                                />
                            </div>
                        </div>

                        <Button
                            type="button"
                            className="w-full h-14 bg-brand-forest hover:bg-brand-forest/80 text-white font-bold rounded-[32px] mt-6 text-base shadow-none transition-colors"
                        >
                            Send reset link
                        </Button>
                    </form>

                    <div className="mt-12 text-center text-sm font-medium text-zinc-600 mb-10">
                        Remember your password?{' '}
                        <Link href="/auth/login" className="text-zinc-900 underline hover:no-underline font-semibold">
                            Log in
                        </Link>
                    </div>
                </div>
            </div>

            {/* Right Section - Image */}
            <div className="hidden lg:block w-[60%] h-screen bg-zinc-50 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[#8129D9]/20 via-brand-lime/20 to-brand-forest/10" />
                <Image
                    src="/auth-bg.png"
                    alt="Background"
                    fill
                    className="object-fit mix-blend-multiply opacity-80"
                />
            </div>
        </div>
    )
}

export default ForgotPassword
