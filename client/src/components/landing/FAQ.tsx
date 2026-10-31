"use client";

import React, { useState } from "react";
import { HelpCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface FAQItem {
  id: string;
  num: string;
  qEn: string;
  qBn: string;
  aEn: string;
  aBn: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    id: "multi-branch",
    num: "01",
    qEn: "Can I manage multiple branches and central warehouse stock from a single dashboard?",
    qBn: "একটি সেন্ট্রাল ড্যাশবোর্ড থেকে কি একাধিক শাখা ও প্রধান ওয়্যারহাউসের স্টক পরিচালনা করা যাবে?",
    aEn: "Yes! PharmaBiz lets you monitor real-time stock levels, transfer items between outlets with digital challans, track staff activity, and view branch-by-branch sales reports from anywhere in real time.",
    aBn: "হ্যাঁ! PharmaBiz-এর মাধ্যমে আপনি যেকোনো স্থান থেকে রিয়েল-টাইমে সব শাখার স্টক লেভেল পর্যবেক্ষণ, ডিজিটাল চালানের মাধ্যমে শাখাগুলোর মধ্যে পণ্য স্থানান্তর, কর্মচারীদের কার্যক্রম এবং প্রতিটি শাখার আলাদা আলাদা বিক্রয় রিপোর্ট দেখতে পারবেন।",
  },
  {
    id: "hardware",
    num: "02",
    qEn: "Does PharmaBiz support standard barcode scanners and thermal receipt printers?",
    qBn: "PharmaBiz কি সাধারণ বারকোড স্ক্যানার এবং থার্মাল রসিদ প্রিন্টার সমর্থন করে?",
    aEn: "Yes! PharmaBiz is fully compatible with all standard ESC/POS 58mm and 80mm thermal receipt printers (USB, LAN, Bluetooth), 1D/2D barcode scanners, cash drawers, and barcode label printers without requiring complex driver configurations.",
    aBn: "হ্যাঁ! PharmaBiz বাজারে থাকা সব ধরনের স্ট্যান্ডার্ড ৫৮মিমি ও ৮০মিমি ESC/POS থার্মাল রসিদ প্রিন্টার (USB, LAN, Bluetooth), ১D/২D বারকোড স্ক্যানার, ক্যাশ ড্রয়ার এবং বারকোড স্টিকার প্রিন্টারের সাথে পুরোপুরি কাজ করে।",
  },
  {
    id: "offline",
    num: "03",
    qEn: "What happens if our branch internet connection drops temporarily?",
    qBn: "আমাদের শাখার ইন্টারনেট সংযোগ সাময়িকভাবে বিচ্ছিন্ন হলে কী ঘটবে?",
    aEn: "PharmaBiz features resilient offline capabilities. Your billing counters can continue selling, scanning barcodes, and printing invoices even during internet cuts. All sales and inventory data automatically sync to the cloud database the moment connection restores.",
    aBn: "PharmaBiz-এ রয়েছে নিরবচ্ছিন্ন অফলাইন সুবিধা। ইন্টারনেট সংযোগ চলে গেলেও আপনার কাউন্টারে বারকোড স্ক্যান, ওষুধ বিক্রি এবং ক্যাশ মেমো প্রিন্ট স্বাভাবিকভাবে চলবে। ইন্টারনেট ফিরে আসার সাথে সাথে সমস্ত ডেটা ক্লাউডে অটো-সিঙ্ক হয়ে যাবে।",
  },
  {
    id: "stock-transfer",
    num: "04",
    qEn: "How does inter-branch stock transfer and digital challan work?",
    qBn: "শাখা থেকে শাখা স্টক ট্রান্সফার এবং ডিজিটাল চালান কীভাবে কাজ করে?",
    aEn: "You can create stock requisition requests between outlets or from the central warehouse. Transfers require digital dispatch and receive verification, instantly updating inventory counts across both locations with zero discrepancies.",
    aBn: "আপনি এক শাখা থেকে অন্য শাখায় বা সেন্ট্রাল ওয়্যারহাউস থেকে রিকুইজিশন তৈরি করতে পারবেন। স্টক প্রেরক ও প্রাপক উভয় পক্ষের ডিজিটাল ভেরিফিকেশনের মাধ্যমে নির্ভুলভাবে তাৎক্ষণিক ইনভেন্টরি আপডেট হয়ে যায়।",
  },
  {
    id: "expiry-batch",
    num: "05",
    qEn: "Can I track product batches, serial/IMEI numbers, and expiry dates?",
    qBn: "পণ্যের ব্যাচ নম্বর, সিরিয়াল নম্বর এবং মেয়াদোত্তীর্ণের তারিখ কি ট্র্যাক করা যায়?",
    aEn: "Yes! PharmaBiz provides end-to-end batch management with expiry date alerts and FEFO (First-Expiry-First-Out) dispensing. You get automated reminders 30, 60, and 90 days before expiry so you never lose revenue on dead stock.",
    aBn: "হ্যাঁ! PharmaBiz-এ রয়েছে পূর্ণাঙ্গ ব্যাচ ও এক্সপায়ারি ম্যানেজমেন্ট। মেয়াদ শেষ হওয়ার ক্ষতি এড়াতে পিওএস স্বয়ংক্রিয়ভাবে FEFO পদ্ধতি অনুসরণ করে এবং মেয়াদ শেষ হওয়ার ৩০, ৬০ ও ৯০ দিন পূর্বেই স্বয়ংক্রিয় অ্যালার্ট প্রদান করে।",
  },
  {
    id: "excel-import",
    num: "06",
    qEn: "Can we import our existing inventory, customer list, and supplier balances from Excel?",
    qBn: "আমাদের বর্তমান ইনভেন্টরি, কাস্টমার লিস্ট এবং সাপ্লায়ার ব্যালেন্স কি এক্সেল থেকে ইমপোর্ট করা যাবে?",
    aEn: "Yes! You can import your entire product catalogue, opening stock, wholesale/retail prices, customer ledgers, and supplier payables in minutes using our guided Excel/CSV bulk import tool.",
    aBn: "হ্যাঁ! আমাদের এক্সেল/সিএসভি বাল্ক ইমপোর্ট টুলের সাহায্যে কয়েক মিনিটের মধ্যেই আপনার বিদ্যমান সমস্ত ওষুধের তালিকা, প্রারম্ভিক স্টক, কেনা/বেচা মূল্য এবং কাস্টমার ও সাপ্লায়ারের বকেয়া হিসাব ইমপোর্ট করে নিতে পারবেন।",
  },
  {
    id: "free-demo",
    num: "07",
    qEn: "Can I try the system before purchasing a subscription?",
    qBn: "সাবস্ক্রিপশন কেনার আগে কি সিস্টেমটি ফ্রিতে ট্রায়াল বা ডেমো হিসেবে ব্যবহার করা যাবে?",
    aEn: "Yes! You can sign up for our Free Demo Tier instantly with zero commitment and no credit card required. Test all POS, inventory, and analytics features with your staff today.",
    aBn: "অবশ্যই! কোনো ক্রেডিট কার্ড বা আর্থিক প্রতিশ্রুতি ছাড়াই আপনি তাৎক্ষণিক ফ্রি ডেমো অ্যাকাউন্ট খুলে আপনার স্টাফদের নিয়ে পিওএস, ইনভেন্টরি ও রিপোর্টিং সরাসরি টেস্ট করতে পারবেন।",
  },
];

export function FAQ() {
  const { lang } = useLanguage();
  const [openId, setOpenId] = useState<string | null>("multi-branch");

  const toggleItem = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <section id="faq" className="py-20 sm:py-24 bg-white border-t border-slate-200">
      <div className="container">
        {/* Top Centered Pill Badge */}
        <div className="flex justify-center mb-5">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200/80 text-xs sm:text-sm lg:text-base font-semibold shadow-xs">
            <HelpCircle className="h-4 w-4 lg:h-5 lg:w-5 text-blue-600 shrink-0" />
            <span>
              {lang === "bn" ? "প্রশ্ন আছে? আমাদের কাছে উত্তর আছে" : "Got Questions? We've Got Answers"}
            </span>
          </div>
        </div>

        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl 2xl:text-6xl font-black text-slate-900 tracking-tight mb-4">
            {lang === "bn" ? "সাধারণ জিজ্ঞাসা (FAQ)" : "Frequently Asked Questions"}
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
            {lang === "bn"
              ? "PharmaBiz মাল্টি-শাখা ক্লাউড পিওএস, ইনভেন্টরি সিঙ্ক এবং হার্ডওয়্যার সামঞ্জস্য সম্পর্কে আপনার প্রয়োজনীয় সব তথ্য।"
              : "Everything you need to know about PharmaBiz Multi-Branch Cloud POS, inventory sync, and hardware compatibility."}
          </p>
        </div>

        {/* Spacious Accordion List */}
        <div className="max-w-4xl mx-auto space-y-4 sm:space-y-5">
          {FAQ_ITEMS.map((item) => {
            const isOpen = openId === item.id;
            const question = lang === "bn" ? item.qBn : item.qEn;
            const answer = lang === "bn" ? item.aBn : item.aEn;

            return (
              <div
                key={item.id}
                className={`bg-white transition-all ${
                  isOpen
                    ? "border border-blue-400 rounded-sm shadow-xs"
                    : "border border-slate-200/90 hover:border-slate-300 rounded-sm"
                }`}
              >
                {/* Accordion Header Button */}
                <button
                  type="button"
                  onClick={() => toggleItem(item.id)}
                  aria-expanded={isOpen}
                  className="w-full p-5 sm:p-7 text-left flex items-start sm:items-center justify-between gap-4 cursor-pointer select-none"
                >
                  <div className="flex items-start sm:items-center gap-3.5 sm:gap-4.5 flex-1 min-w-0">
                    {/* Number Badge */}
                    <span
                      className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 text-xs sm:text-sm lg:text-base font-bold rounded-xs shrink-0 transition-colors ${
                        isOpen
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {item.num}
                    </span>

                    {/* Question Text */}
                    <h3
                      className={`text-base sm:text-lg lg:text-xl 2xl:text-[22px] font-bold leading-snug transition-colors ${
                        isOpen ? "text-blue-600" : "text-slate-900"
                      }`}
                    >
                      {question}
                    </h3>
                  </div>

                  {/* Circular Chevron Button */}
                  <div
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                      isOpen
                        ? "bg-blue-50 text-blue-600"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4 sm:h-5 sm:w-5" />
                    ) : (
                      <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5" />
                    )}
                  </div>
                </button>

                {/* Accordion Answer Content (Indented to align with question text) */}
                {isOpen && (
                  <div className="px-5 sm:px-7 pb-6 sm:pb-7 pt-0 sm:pl-[4.5rem]">
                    <p className="text-sm sm:text-base lg:text-lg text-slate-600 leading-relaxed font-normal">
                      {answer}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
