import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import {
  Mail, Phone, MapPin, Send, MessageSquare, Clock,
  Facebook, Twitter, Linkedin, Instagram, Loader2, CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/api/axios';

const contactInfo = [
  { icon: Mail, label: 'Email Us', value: 'support@tribescliqs.com', href: 'mailto:support@tribescliqs.com' },
  { icon: Phone, label: 'Call Us', value: '+233 30 000 0000', href: 'tel:+233300000000' },
  { icon: MapPin, label: 'Visit Us', value: 'Accra, Ghana', href: null },
  { icon: Clock, label: 'Hours', value: 'Mon - Fri, 9am - 6pm GMT', href: null },
];

const socials = [
  { icon: Facebook, label: 'Facebook', href: '#' },
  { icon: Twitter, label: 'Twitter', href: '#' },
  { icon: Instagram, label: 'Instagram', href: '#' },
  { icon: Linkedin, label: 'LinkedIn', href: '#' },
];

export default function ContactPage() {
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      await api.post('/contact', data);
      toast.success('Message sent! We\'ll get back to you soon.');
      setSent(true);
      reset();
      setTimeout(() => setSent(false), 4000);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send message. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = (field) =>
    `w-full px-4 py-3 rounded-lg bg-[#1C232B] border text-sm text-[#EFEFF1] placeholder:text-[#494F55] focus:outline-none transition-colors ${
      errors[field] ? 'border-red-500/50 focus:border-red-500' : 'border-[#494F55]/40 focus:border-white/50'
    }`;

  return (
    <>
      {/* Hero */}
      <section className="pt-28 pb-14 sm:pt-36 sm:pb-18 border-b border-[#262B2F] mb-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#161D22] border border-[#494F55]/60 text-white text-xs font-semibold uppercase tracking-widest mb-6">
              <MessageSquare className="w-3.5 h-3.5" /> Support &amp; Enquiries
            </span>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-[#EFEFF1] tracking-tight">How Can We Help?</h1>
            <p className="mt-4 text-base sm:text-lg text-[#949599] max-w-xl mx-auto leading-relaxed">
              Have questions about tickets, need organizer help, or want to partner with us? Our team is here to assist.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact info cards */}
      <section className="pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {contactInfo.map((info, i) => (
              <motion.div
                key={info.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.06 }}
                className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-5 text-center"
              >
                <div className="w-12 h-12 rounded-lg bg-white/10 text-white flex items-center justify-center mx-auto mb-3">
                  <info.icon className="w-6 h-6" />
                </div>
                <p className="text-xs font-medium uppercase tracking-wider text-[#949599]">{info.label}</p>
                {info.href ? (
                  <a href={info.href} className="mt-1 block text-sm font-semibold text-[#EFEFF1] hover:text-white transition">
                    {info.value}
                  </a>
                ) : (
                  <p className="mt-1 text-sm font-semibold text-[#EFEFF1]">{info.value}</p>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Form + sidebar */}
      <section className="py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="lg:col-span-2 rounded-2xl bg-[#171A1D] border border-[#262B2F] p-6 sm:p-8"
            >
              <h2 className="text-xl font-bold text-[#EFEFF1] mb-1">Send us a message</h2>
              <p className="text-sm text-[#949599] mb-6">Fill out the form below and we'll be in touch.</p>

              {sent ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#EFEFF1]">Message Sent!</h3>
                  <p className="mt-1 text-sm text-[#949599]">Thank you for reaching out. We'll respond shortly.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#949599] mb-1.5">Full Name</label>
                      <input
                        type="text"
                        placeholder="John Doe"
                        {...register('name', { required: 'Name is required' })}
                        className={inputClass('name')}
                      />
                      {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name.message}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#949599] mb-1.5">Email</label>
                      <input
                        type="email"
                        placeholder="john@example.com"
                        {...register('email', {
                          required: 'Email is required',
                          pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid email' },
                        })}
                        className={inputClass('email')}
                      />
                      {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#949599] mb-1.5">Subject</label>
                    <input
                      type="text"
                      placeholder="How can we help?"
                      {...register('subject', { required: 'Subject is required' })}
                      className={inputClass('subject')}
                    />
                    {errors.subject && <p className="mt-1 text-xs text-red-400">{errors.subject.message}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#949599] mb-1.5">Message</label>
                    <textarea
                      rows="5"
                      placeholder="Tell us more..."
                      {...register('message', { required: 'Message is required' })}
                      className={`${inputClass('message')} resize-none`}
                    />
                    {errors.message && <p className="mt-1 text-xs text-red-400">{errors.message.message}</p>}
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-white text-[#1C232B] text-sm font-semibold hover:bg-[#CBD5E1] transition disabled:opacity-60"
                  >
                    {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : <><Send className="w-4 h-4" /> Send Message</>}
                  </button>
                </form>
              )}
            </motion.div>

            {/* Sidebar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="space-y-4"
            >
              <div className="rounded-2xl bg-[#171A1D] border border-[#262B2F] p-6">
                <h3 className="text-sm font-semibold text-[#EFEFF1] mb-4">Connect with us</h3>
                <p className="text-sm text-[#949599] mb-4">Follow us on social media for the latest updates and event news.</p>
                <div className="grid grid-cols-2 gap-2">
                  {socials.map((s) => (
                    <a
                      key={s.label}
                      href={s.href}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[#1C232B] border border-[#262B2F] text-sm text-[#949599] hover:text-white hover:border-white/40 transition"
                    >
                      <s.icon className="w-4 h-4" /> {s.label}
                    </a>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-gradient-to-br from-white/10 to-[#171A1D] border border-white/20 p-6">
                <h3 className="text-sm font-semibold text-[#EFEFF1]">Need faster help?</h3>
                <p className="mt-2 text-sm text-[#949599]">Check out our Help Center for instant answers to common questions.</p>
                <a href="/faq" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-white hover:underline">
                  Visit FAQ →
                </a>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </>
  );
}
