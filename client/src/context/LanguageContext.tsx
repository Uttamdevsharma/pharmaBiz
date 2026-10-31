"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type Language = "en" | "bn";

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Nav
    home: "Home",
    pricing: "Pricing",
    contact: "Contact",
    signIn: "Sign In",
    login: "Login",
    getStarted: "Get Started",
    freeDemo: "Free Demo",
    dashboard: "Dashboard",
    adminPanel: "Admin Panel",

    // Pricing
    subscriptionPlans: "Subscription Plans",
    monthlyBilling: "Monthly Billing",
    annualBilling: "Annual Billing",
    save20: "Save 20%",
    includedCapabilities: "INCLUDED CAPABILITIES",
    perMonth: "/month",
    perYear: "/year",
    daysFree: "Days Free",
    customSales: "Sales Consultation",
    choosePlan: "Choose",
    claimDemo: "Claim Free Demo",
    chatWhatsapp: "Chat on WhatsApp",
    branches: "Branches",
    staffPerBranch: "Staff / Branch",
    unlimited: "Unlimited",
    pricingKicker: "Simple, transparent pricing",
    pricingTitle: "Choose a plan that fits.",
    pricingSubtitle: "Start free for 14 days. Upgrade, switch, or cancel whenever you want.",
    monthly: "Monthly",
    yearly: "Yearly",
    save20Percent: "Save 20%",
    mostPopular: "Most popular",
    customTier: "Custom",
    contactOwner: "Contact System Owner",
    tailoredForYou: "/ tailored for you",
    freeTrialDose: "/ free trial",
    perMonthUnit: "/ month",
    billedYearlyPrefix: "Billed ৳",
    billedYearlySuffix: " yearly",
    whatsIncluded: "What’s included",
    pricingFootnote: "All prices exclude VAT. Need a custom plan?",
    talkToTeam: "Talk to our team",

    // Contact
    contactAssistPill: "We Are Here To Assist You",
    contactTitle: "Get In Touch With Our Team",
    contactSubtitle: "Have questions about multi-branch onboarding, thermal printer hardware, or data migration from your existing POS? Let's talk.",
    directSupportEmail: "Direct Support Email",
    directSupportEmailDesc: "For sales inquiries, billing assistance, and customer support.",
    directPhoneWhatsapp: "Direct Phone / WhatsApp",
    directPhoneHours: "Saturday – Thursday: 9:00 AM – 9:00 PM",
    officeLocation: "Office Location",
    officeLocationAddress: "60 Feet Road, Mirpur, Dhaka, Bangladesh",
    sendUsMessage: "Send Us A Message",
    fullName: "Full Name *",
    businessEmail: "Business Email *",
    phoneNumber: "Phone Number *",
    outletsNumber: "Number of Outlets / Branches",
    outletSingle: "1 Single Outlet",
    outlets2to5: "2 to 5 Outlets",
    outlets6plus: "6+ Enterprise Outlets",
    helpQuestion: "How can we help your business? *",
    helpPlaceholder: "Tell us about your branch network, warehouse locations, and inventory requirements...",
    sendMessageNow: "Send Message Now",
    sending: "Sending...",
    messageReceived: "Message Received!",
    messageReceivedDesc: "Thank you for reaching out. Our healthcare onboarding specialist will contact you shortly.",
    sendAnother: "Send another message",

    // Register
    registerTitle: "Register Your Pharmacy",
    registerSubtitle: "Complete the simple steps to launch your pharmacy operating system.",
    step1Tab: "1. Owner Info",
    step2Tab: "2. Documents",
    step3Tab: "3. Plan & Submit",
    step1Heading: "Step 1: Owner & Pharmacy Info",
    step1Subtitle: "Enter your pharmacy and account credentials.",
    pharmacyLegalName: "Pharmacy Legal Name *",
    pharmacyLegalNamePlaceholder: "e.g. Popular Pharmacy Ltd.",
    ownerNameLabel: "Owner Name *",
    ownerNamePlaceholder: "e.g. Dr. Rafiqul Islam",
    phoneLabel: "Phone Number *",
    phonePlaceholder: "017XXXXXXXX (11-12 digits)",
    emailLabel: "Email Address *",
    emailPlaceholder: "owner@example.com",
    addressLabel: "Pharmacy Address *",
    addressPlaceholder: "e.g. Dhanmondi, Dhaka",
    passwordLabel: "Password *",
    passwordPlaceholder: "Minimum 6 characters",
    confirmPasswordLabel: "Confirm Password *",
    confirmPasswordPlaceholder: "Re-enter password",
    continueToStep2: "Continue to Step 2",
    step2Heading: "Step 2: License Documents",
    step2Subtitle: "Upload your NID, Trade License, and Drug License.",
    nidSectionTitle: "1. National ID (NID) *",
    nidNumberLabel: "NID Number *",
    nidNumberPlaceholder: "e.g. 19902692512345678",
    nidFrontLabel: "Front Side *",
    nidBackLabel: "Back Side *",
    uploadFrontBtn: "Upload Front Side",
    changeFrontBtn: "Change Front File",
    uploadBackBtn: "Upload Back Side",
    changeBackBtn: "Change Back File",
    tradeSectionTitle: "2. Trade License *",
    tradeNumberLabel: "Trade License Number *",
    tradeNumberPlaceholder: "e.g. TRAD/DNCC/019283/2026",
    uploadTradeBtn: "Upload Trade License",
    changeTradeBtn: "Change Document",
    drugSectionTitle: "3. Drug License *",
    drugNumberLabel: "Drug License Number *",
    drugNumberPlaceholder: "e.g. DL-DHAKA-2024-9988",
    uploadDrugBtn: "Upload Drug License",
    changeDrugBtn: "Change Document",
    backBtn: "Back",
    continueToStep3: "Continue to Step 3",
    step3Heading: "Step 3: Select Plan & Submit",
    step3Subtitle: "Review your summary and choose a subscription plan.",
    appSummaryTitle: "Application Summary",
    pharmacyLabelShort: "Pharmacy:",
    ownerLabelShort: "Owner:",
    emailLabelShort: "Email:",
    phoneLabelShort: "Phone:",
    nidNoShort: "NID No:",
    tradeShort: "Trade License:",
    drugShort: "Drug License:",
    choosePlanLabel: "Choose Subscription Plan *",
    billingIntervalLabel: "Billing Interval",
    yearlyDiscountBadge: "Yearly (-15%)",
    initialInvestmentTitle: "Initial Registration Investment",
    freeTrialSummaryTitle: "Free Trial Registration Summary",
    licenseFeeLabel: "One-Time Software License Fee:",
    totalPayableApproval: "Total Payable Upon Approval:",
    totalPayableNow: "Total Payable Now:",
    trialNoCardNotice: "No payment or credit card required during trial period",
    termsAgreeText: "I have read and agree to the",
    termsPolicyLink: "Terms & Conditions and Data Retention Policy",
    submitRegistrationBtn: "Submit Application & Verify OTP",
    submitDemoBtn: "Submit & Verify with OTP (Free Trial)",

    // Footer
    footerDesc: "Next-generation cloud Point of Sale & Multi-Branch Inventory Management system built for high-growth retailers, pharmacies, and enterprise chains.",
    platform: "PLATFORM",
    homeOverview: "Home Overview",
    subPlans: "Subscription Plans",
    registerKyc: "Register Business (KYC)",
    posPortalLogin: "POS Portal Login",
    keySolutions: "KEY SOLUTIONS",
    barcodePos: "Real-time Barcode POS",
    stockTransfer: "Inter-Branch Stock Transfer",
    financeLedger: "Multi-Account Finance Ledger",
    expiryTracking: "Damage & Expiry Tracking",
    thermalPrinting: "Thermal Printing & Barcoding",
    contactSupport: "CONTACT & SUPPORT",
    allRightsReserved: "All rights reserved.",
    craftedWith: "Crafted with ❤️ by",

    // Hero
    heroTitle1: "Manage your pharmacy.",
    heroTitle2: "Faster, simpler, smarter.",
    heroLead: "One simple platform to manage inventory, sales, staff, and insights—so you can focus on healthier customers and a stronger business.",
    heroRegister: "Register",
    heroSeeHow: "See how it works",
    heroNoCard: "No credit card",
    heroFastSetup: "Setup in 10 minutes",
    heroCancelAnytime: "Cancel anytime",

    // Features
    featuresKicker: "Everything in one place",
    featuresHeading1: "Save time. Sell ",
    featuresHeading2: "more.",
    featuresSubtitle: "Powerful tools that make everyday pharmacy operations feel effortless.",

    // How It Works
    howKicker: "Fast & Easy Setup",
    howHeading: "Start selling in just 10 minutes.",
    howSubtitle: "BizPharma is designed for busy pharmacy teams. No technical expertise, complicated training, or long setup needed.",
    howStep1Title: "Create your account",
    howStep1Desc: "Tell us a little about your pharmacy.",
    howStep2Title: "Import your inventory",
    howStep2Desc: "Upload a file or add products as you sell.",
    howStep3Title: "Start running smarter",
    howStep3Desc: "Your dashboard is ready to work for you.",
  },
  bn: {
    // Nav
    home: "হোম",
    pricing: "প্রাইসিং",
    contact: "যোগাযোগ",
    signIn: "সাইন ইন",
    login: "লগইন",
    getStarted: "শুরু করুন",
    freeDemo: "ফ্রি ডেমো",
    dashboard: "ড্যাশবোর্ড",
    adminPanel: "অ্যাডমিন প্যানেল",

    // Pricing
    subscriptionPlans: "সাবস্ক্রিপশন প্ল্যান",
    monthlyBilling: "মাসিক বিলিং",
    annualBilling: "বার্ষিক বিলিং",
    save20: "২০% সাশ্রয়",
    includedCapabilities: "অন্তর্ভুক্ত সুবিধাসমূহ",
    perMonth: "/মাস",
    perYear: "/বছর",
    daysFree: "দিন ফ্রি",
    customSales: "কাস্টম পরামর্শ",
    choosePlan: "বেছে নিন",
    claimDemo: "ফ্রি ডেমো শুরু করুন",
    chatWhatsapp: "হোয়াটসঅ্যাপে চ্যাট করুন",
    branches: "শাখা",
    staffPerBranch: "কর্মী / শাখা",
    unlimited: "আনলিমিটেড",
    pricingKicker: "সহজ ও স্বচ্ছ সাবস্ক্রিপশন প্ল্যান",
    pricingTitle: "আপনার উপযোগী প্ল্যানটি বেছে নিন।",
    pricingSubtitle: "১৪ দিনের ফ্রি ট্রায়াল। যেকোনো সময় আপগ্রেড, পরিবর্তন বা বাতিল করতে পারেন।",
    monthly: "মাসিক",
    yearly: "বার্ষিক",
    save20Percent: "২০% সাশ্রয়",
    mostPopular: "সর্বাধিক জনপ্রিয়",
    customTier: "কাস্টম",
    contactOwner: "সরাসরি যোগাযোগ করুন",
    tailoredForYou: "/ আপনার ফার্মেসির উপযোগী",
    freeTrialDose: "/ ফ্রি ট্রায়াল",
    perMonthUnit: "/ মাস",
    billedYearlyPrefix: "বার্ষিক মোট ৳",
    billedYearlySuffix: "",
    whatsIncluded: "যা যা অন্তর্ভুক্ত রয়েছে",
    pricingFootnote: "সকল মূল্য ভ্যাট ব্যতীত। কাস্টম প্ল্যান প্রয়োজন?",
    talkToTeam: "আমাদের সাথে কথা বলুন",

    // Contact
    contactAssistPill: "আমরা আপনাকে সহায়তা করতে প্রস্তুত",
    contactTitle: "আমাদের টিমের সাথে যোগাযোগ করুন",
    contactSubtitle: "মাল্টি-ব্রাঞ্চ অনবোর্ডিং, থার্মাল প্রিন্টার বা ডেটা মাইগ্রেশন নিয়ে কোনো প্রশ্ন থাকলে সরাসরি আমাদের সাথে কথা বলুন।",
    directSupportEmail: "সরাসরি সাপোর্ট ইমেইল",
    directSupportEmailDesc: "বিক্রয় তথ্য, বিলিং সহায়তা ও গ্রাহক সাপোর্টের জন্য।",
    directPhoneWhatsapp: "সরাসরি ফোন / হোয়াটসঅ্যাপ",
    directPhoneHours: "শনিবার – বৃহস্পতিবার: সকাল ৯:০০ – রাত ৯:০০",
    officeLocation: "অফিস ঠিকানা",
    officeLocationAddress: "৬০ ফিট রোড, মিরপুর, ঢাকা, বাংলাদেশ",
    sendUsMessage: "আমাদের একটি বার্তা পাঠান",
    fullName: "পুরো নাম *",
    businessEmail: "ব্যবসায়িক ইমেইল *",
    phoneNumber: "ফোন নম্বর *",
    outletsNumber: "আউটলেট / শাখার সংখ্যা",
    outletSingle: "১ টি একক আউটলেট",
    outlets2to5: "২ থেকে ৫ টি আউটলেট",
    outlets6plus: "৬+ টি এন্টারপ্রাইজ আউটলেট",
    helpQuestion: "আমরা আপনার ব্যবসাকে কীভাবে সহায়তা করতে পারি? *",
    helpPlaceholder: "আপনার ফার্মেসির শাখা নেটওয়ার্ক ও ইনভেন্টরি সফটওয়্যারের চাহিদা সম্পর্কে লিখুন...",
    sendMessageNow: "এখনই বার্তা পাঠান",
    sending: "পাঠানো হচ্ছে...",
    messageReceived: "বার্তা সফলভাবে পাঠানো হয়েছে!",
    messageReceivedDesc: "যোগাযোগ করার জন্য ধন্যবাদ। আমাদের প্রতিনিধি দ্রুত আপনার সাথে যোগাযোগ করবেন।",
    sendAnother: "আরেকটি বার্তা পাঠান",

    // Register
    registerTitle: "ফার্মেসি নিবন্ধন করুন",
    registerSubtitle: "সহজ কয়েকটি ধাপে আপনার ফার্মেসি পিওএস অ্যাকাউন্ট তৈরি করুন।",
    step1Tab: "১. মালিক ও ফার্মেসির তথ্য",
    step2Tab: "২. ডকুমেন্টস",
    step3Tab: "৩. প্ল্যান ও সাবমিট",
    step1Heading: "ধাপ ১: মালিক ও ফার্মেসির তথ্য",
    step1Subtitle: "আপনার ফার্মেসি এবং লগইন তথ্যাদি প্রবেশ করুন।",
    pharmacyLegalName: "ফার্মেসির নাম *",
    pharmacyLegalNamePlaceholder: "যেমন: পপুলার ফার্মেসি",
    ownerNameLabel: "মালিকের নাম *",
    ownerNamePlaceholder: "যেমন: মো: রফিকুল ইসলাম",
    phoneLabel: "মোবাইল নম্বর *",
    phonePlaceholder: "০১XXXXXXXXX (১১-১২ ডিজিট)",
    emailLabel: "ইমেইল এড্রেস *",
    emailPlaceholder: "owner@example.com",
    addressLabel: "ফার্মেসির ঠিকানা *",
    addressPlaceholder: "যেমন: ধানমন্ডি, ঢাকা",
    passwordLabel: "পাসওয়ার্ড *",
    passwordPlaceholder: "কমপক্ষে ৬ ডিজিট",
    confirmPasswordLabel: "পাসওয়ার্ড নিশ্চিত করুন *",
    confirmPasswordPlaceholder: "পাসওয়ার্ড পুনরায় লিখুন",
    continueToStep2: "পরবর্তী ধাপ (ডকুমেন্টস) ২ এ যান",
    step2Heading: "ধাপ ২: লাইসেন্স ও নথিপত্র",
    step2Subtitle: "আপনার জাতীয় পরিচয়পত্র (NID), ট্রেড লাইসেন্স ও ড্রাগ লাইসেন্স আপলোড করুন।",
    nidSectionTitle: "১. জাতীয় পরিচয়পত্র (NID) *",
    nidNumberLabel: "এনআইডি (NID) নম্বর *",
    nidNumberPlaceholder: "যেমন: ১৯৯০২৬৯২৫১২৩৪৫৬৭৮",
    nidFrontLabel: "সামনের অংশ *",
    nidBackLabel: "পেছনের অংশ *",
    uploadFrontBtn: "সামনের ছবি আপলোড করুন",
    changeFrontBtn: "সামনের ফাইল পরিবর্তন",
    uploadBackBtn: "পেছনের ছবি আপলোড করুন",
    changeBackBtn: "পেছনের ফাইল পরিবর্তন",
    tradeSectionTitle: "২. ট্রেড লাইসেন্স *",
    tradeNumberLabel: "ট্রেড লাইসেন্স নম্বর *",
    tradeNumberPlaceholder: "যেমন: TRAD/DNCC/019283/2026",
    uploadTradeBtn: "ট্রেড লাইসেন্স আপলোড করুন",
    changeTradeBtn: "ডকুমেন্ট পরিবর্তন",
    drugSectionTitle: "৩. ড্রাগ লাইসেন্স *",
    drugNumberLabel: "ড্রাগ লাইসেন্স নম্বর *",
    drugNumberPlaceholder: "যেমন: DL-DHAKA-2024-9988",
    uploadDrugBtn: "ড্রাগ লাইসেন্স আপলোড করুন",
    changeDrugBtn: "ডকুমেন্ট পরিবর্তন",
    backBtn: "পূর্ববর্তী",
    continueToStep3: "পরবর্তী ধাপ (প্ল্যান নির্বাচন) ৩ এ যান",
    step3Heading: "ধাপ ৩: প্ল্যান নির্বাচন ও সাবমিট",
    step3Subtitle: "আপনার আবেদন পর্যালোচনা করুন এবং সাবস্ক্রিপশন প্ল্যান বেছে নিন।",
    appSummaryTitle: "আবেদনের সারসংক্ষেপ",
    pharmacyLabelShort: "ফার্মেসি:",
    ownerLabelShort: "মালিক:",
    emailLabelShort: "ইমেইল:",
    phoneLabelShort: "মোবাইল:",
    nidNoShort: "এনআইডি:",
    tradeShort: "ট্রেড লাইসেন্স:",
    drugShort: "ড্রাগ লাইসেন্স:",
    choosePlanLabel: "সাবস্ক্রিপশন প্ল্যান বেছে নিন *",
    billingIntervalLabel: "বিলিং সময়কাল",
    yearlyDiscountBadge: "বার্ষিক (১৫% ছাড়)",
    initialInvestmentTitle: "প্রাথমিক নিবন্ধন বিনিয়োগ",
    freeTrialSummaryTitle: "ফ্রি ট্রায়াল নিবন্ধনের সারসংক্ষেপ",
    licenseFeeLabel: "এককালীন সফটওয়্যার লাইসেন্স ফি:",
    totalPayableApproval: "অনুমোদনের পর প্রদেয় মোট:",
    totalPayableNow: "এখন প্রদেয় মোট:",
    trialNoCardNotice: "ট্রায়াল চলাকালীন কোনো পেমেন্ট বা কার্ডের প্রয়োজন নেই",
    termsAgreeText: "আমি সেবা গ্রহণের",
    termsPolicyLink: "শর্তাবলী এবং গোপনীয়তা নীতি মেনে নিচ্ছি",
    submitRegistrationBtn: "আবেদন সাবমিট করুন ও ওটিপি যাচাই করুন",
    submitDemoBtn: "সাবমিট করুন ও ওটিপি যাচাই করুন (ফ্রি ট্রায়াল)",

    // Footer
    footerDesc: "রিটেইলার ও আধুনিক ফার্মেসি চেইনের জন্য নেক্সট-জেনারেশন ক্লাউড পিওএস ও মাল্টি-ব্রাঞ্চ ইনভেন্টরি ম্যানেজমেন্ট সিস্টেম।",
    platform: "প্ল্যাটফর্ম",
    homeOverview: "হোম ওভারভিউ",
    subPlans: "সাবস্ক্রিপশন প্ল্যান",
    registerKyc: "ফার্মেসি রেজিস্ট্রেশন (KYC)",
    posPortalLogin: "পিওএস পোর্টাল লগইন",
    keySolutions: "মূল সমাধানসমূহ",
    barcodePos: "রিয়েল-টাইম বারকোড পিওএস",
    stockTransfer: "আন্তঃশাখা স্টক ট্রান্সফার",
    financeLedger: "মাল্টি-অ্যাকাউন্ট ফাইন্যান্স লেজার",
    expiryTracking: "ড্যামেজ ও মেয়াদোত্তীর্ণ ট্র্যাকিং",
    thermalPrinting: "থার্মাল প্রিন্টিং ও বারকোডিং",
    contactSupport: "যোগাযোগ ও সাপোর্ট",
    allRightsReserved: "সর্বস্বত্ব সংরক্ষিত।",
    craftedWith: "Crafted with ❤️ by",

    // Hero
    heroTitle1: "আপনার ফার্মেসি পরিচালনা করুন।",
    heroTitle2: "আরও দ্রুত, সহজে ও স্মার্টভাবে।",
    heroLead: "ইনভেন্টরি, সেলস, কর্মী ও হিসাবের গরমিল ছাড়া একটি সহজ ক্লাউড প্ল্যাটফর্মেই সম্পূর্ণ ফার্মেসি পরিচালনা করুন।",
    heroRegister: "রেজিস্ট্রেশন করুন",
    heroSeeHow: "কীভাবে কাজ করে দেখুন",
    heroNoCard: "ক্রেডিট কার্ড প্রয়োজন নেই",
    heroFastSetup: "১০ মিনিটে সেটাপ",
    heroCancelAnytime: "যেকোনো সময় বাতিলযোগ্য",

    // Features
    featuresKicker: "সবকিছু এক জায়গায়",
    featuresHeading1: "সময় বাঁচান। বিক্রি ",
    featuresHeading2: "বাড়ান।",
    featuresSubtitle: "শক্তিশালী ফিচারসমূহ যা প্রতিদিনের ফার্মেসি পরিচালনাকে করে তোলে অত্যন্ত সহজ।",

    // How It Works
    howKicker: "দ্রুত ও সহজ সেটাপ",
    howHeading: "মাত্র ১০ মিনিটেই বিক্রি শুরু করুন।",
    howSubtitle: "ব্যস্ত ফার্মেসি টিমের জন্য তৈরি। কোনো টেকনিক্যাল জ্ঞান, জটিল ট্রেনিং বা লম্বা সেটাপের প্রয়োজন নেই।",
    howStep1Title: "অ্যাকাউন্ট তৈরি করুন",
    howStep1Desc: "আপনার ফার্মেসি সম্পর্কে প্রাথমিক তথ্য দিন।",
    howStep2Title: "ইনভেন্টরি যুক্ত করুন",
    howStep2Desc: "এক্সেল ফাইল আপলোড করুন অথবা বিক্রির সাথে সাথে ওষুধ যোগ করুন।",
    howStep3Title: "স্মার্ট পরিচালনা শুরু করুন",
    howStep3Desc: "আপনার পিওএস ড্যাশবোর্ড ব্যবহারের জন্য সম্পূর্ণ প্রস্তুত।",
  },
};

const LanguageContext = createContext<LanguageContextType>({
  lang: "en",
  setLang: () => {},
  toggleLang: () => {},
  t: (key: string) => key,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>("en");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("pharmabiz_lang") as Language;
      if (saved === "en" || saved === "bn") {
        setLangState(saved);
      }
    }
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    if (typeof window !== "undefined") {
      localStorage.setItem("pharmabiz_lang", newLang);
    }
  };

  const toggleLang = () => {
    setLang(lang === "en" ? "bn" : "en");
  };

  const t = (key: string): string => {
    return translations[lang]?.[key] || translations.en?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
