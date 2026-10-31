"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSettings } from "@/context/SettingsContext";
import { useLanguage } from "@/context/LanguageContext";
import { fetchApi } from "@/lib/api";
import { Icon } from "./LandingIcons";
import { MessageSquare } from "lucide-react";

const featureTranslations: Record<string, string> = {
  "Full Offline POS Counter Dispensing": "ফুল অফলাইন পিওএস কাউন্টার বিলিং",
  "Multi-Branch Stock Synchronization": "মাল্টি-ব্রাঞ্চ স্টক অটো সিনক্রোনাইজেশন",
  "Inventory & Batch Expiry Tracking": "ইনভেন্টরি ও ব্যাচ অনুযায়ী মেয়াদোত্তীর্ণ ট্র্যাকিং",
  "Sales & Financial Ledger Analytics": "সেলস, প্রফিট ও আর্থিক লেজার রিপোর্ট",
  "Up to 3 pharmacy outlets": "সর্বোচ্চ ৩টি ফার্মেসি আউটলেট",
  "1 pharmacy outlet": "১টি ফার্মেসি আউটলেট",
  "2 staff accounts": "২ জন কর্মী অ্যাকাউন্ট",
  "10 staff accounts": "১০ জন কর্মী অ্যাকাউন্ট",
  "Unlimited outlets": "আনলিমিটেড ফার্মেসি আউটলেট",
  "Unlimited staff": "আনলিমিটেড কর্মী অ্যাকাউন্ট",
  "Advanced analytics": "উন্নত অ্যানালিটিক্স ও রিপোর্ট",
  "Supplier management": "সাপ্লায়ার ও পারচেজ ম্যানেজমেন্ট",
  "Priority support": "অগ্রাধিকার ভিত্তিক সাপোর্ট",
  "Consolidated reporting": "সেন্ট্রালাইজড কনসোলিডেটেড রিপোর্টিং",
  "Custom roles & permissions": "কাস্টম রোল ও পারমিশন কন্ট্রোল",
  "Dedicated success manager": "ডেডিকেটেড একাউন্ট ও সাপোর্ট ম্যানেজার",
  "Basic Audit Trail": "অডিট ট্রেইল লগ",
  "1 Staff per Branch": "প্রতি ব্রাঞ্চে ১ জন কর্মী",
  "Max 2 Branches (Main + 1)": "সর্বোচ্চ ২টি ব্রাঞ্চ (মেইন + ১)",
  "Inventory and expiry alerts": "ইনভেন্টরি ও মেয়াদোত্তীর্ণ সতর্কবার্তা",
  "Sales and purchase reports": "বিক্রয় ও ক্রয়ের পূর্ণাঙ্গ রিপোর্ট",
};

const descTranslations: Record<string, string> = {
  "Experience all full features with zero risk.": "ঝুঁকি ছাড়াই সব ফিচার ব্যবহারের অভিজ্ঞতা নিন।",
  "Everything you need to run one pharmacy.": "একটি ফার্মেসি সুন্দরভাবে চালানোর প্রয়োজনীয় সবকিছু।",
  "For growing pharmacies ready to scale.": "বড় ফার্মেসির দ্রুত প্রসারের জন্য উপযুক্ত।",
  "Power, customization, and dedicated support for pharmacy groups.": "ফার্মেসি চেইনের জন্য ক্ষমতা, কাস্টমাইজেশন ও ডেডিকেটেড সাপোর্ট।",
  "Power and control for pharmacy chains.": "ফার্মেসি চেইনের পূর্ণ নিয়ন্ত্রণ ও সক্ষমতা।",
};

export function LandingPricing() {
  const { settings, refreshSettings } = useSettings();
  const { lang, t } = useLanguage();
  const [annual, setAnnual] = useState(false);
  const [livePlans, setLivePlans] = useState<any[] | null>(null);

  useEffect(() => {
    refreshSettings?.();
    fetchApi<any>("/settings/public")
      .then((res) => {
        if (res.success && res.data?.plans && Array.isArray(res.data.plans)) {
          setLivePlans(res.data.plans);
        }
      })
      .catch((err) => console.warn("Could not fetch fresh public plans", err));
  }, []);

  const fallbackPlans = [
    {
      id: "starter",
      name: "Starter",
      tier: "STARTER",
      price: 1000,
      description: "Everything you need to run one pharmacy.",
      features: [
        "1 pharmacy outlet",
        "2 staff accounts",
        "Inventory & expiry alerts",
        "Sales and purchase reports",
      ],
      popular: false,
      isCustom: false,
      isTrial: false,
    },
    {
      id: "growth",
      name: "Growth",
      tier: "GROWTH",
      price: 2000,
      description: "For growing pharmacies ready to scale.",
      features: [
        "Up to 3 pharmacy outlets",
        "10 staff accounts",
        "Advanced analytics",
        "Supplier management",
        "Priority support",
      ],
      popular: true,
      isCustom: false,
      isTrial: false,
    },
    {
      id: "enterprise",
      name: "Enterprise",
      tier: "ENTERPRISE",
      price: 0,
      description: "Power and control for pharmacy chains.",
      features: [
        "Unlimited outlets",
        "Unlimited staff",
        "Consolidated reporting",
        "Custom roles & permissions",
        "Dedicated success manager",
      ],
      popular: false,
      isCustom: true,
      isTrial: false,
    },
  ];

  // Resolve and sort plans: Free/Trial FIRST, then Starter, then Growth, then Enterprise/Custom
  const rawPlans = (livePlans || settings.plans || []).filter(
    (p: any) => p.isActive !== false
  );

  let formattedPlans = fallbackPlans;

  if (rawPlans.length > 0) {
    const hasAnyExplicitPopular = rawPlans.some(
      (p: any) => p.isPopular === true || p.features?.isPopular === true
    );

    formattedPlans = rawPlans.map((p: any, idx: number) => {
      let fList: string[] = [];
      if (Array.isArray(p.features?.featureList) && p.features.featureList.length > 0) {
        fList = p.features.featureList;
      } else if (Array.isArray(p.featureList) && p.featureList.length > 0) {
        fList = p.featureList;
      } else if (typeof p.features === "object" && p.features !== null) {
        fList = Object.entries(p.features)
          .filter(([k, v]) => v === true && !["isTrial", "isPopular"].includes(k))
          .map(([k]) => k.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase()));
      }

      if (fList.length === 0) {
        fList = fallbackPlans[idx % fallbackPlans.length].features;
      }

      const isTrial =
        Number(p.trialDays) > 0 ||
        p.tier === "TRIAL" ||
        p.isTrial === true ||
        p.features?.isTrial === true;

      const isEnterprise =
        p.tier === "ENTERPRISE" ||
        p.isCustom === true ||
        p.name?.toLowerCase().includes("enterprise") ||
        p.name?.toLowerCase().includes("custom");

      // Strictly ensure only one plan is popular:
      // If super admin has configured any plan as isPopular, only that plan will be popular.
      // If no plan has isPopular explicitly set, default Growth (and only Growth) to popular.
      const isPopular = hasAnyExplicitPopular
        ? Boolean(p.isPopular === true || p.features?.isPopular === true)
        : (p.tier === "GROWTH" && !isTrial && !isEnterprise);

      const rawPrice = Number(p.price) || 0;

      // Clean display name
      const cleanName =
        p.name?.replace(/^Plan\s+\d+\s*[-–]\s*/i, "") ||
        (isTrial ? "Free Demo" : isEnterprise ? "Enterprise" : p.tier || "Standard");

      return {
        id: p.id,
        name: cleanName,
        tier: p.tier,
        price: isTrial || isEnterprise ? 0 : rawPrice,
        description:
          p.description ||
          (isTrial
            ? "Experience all full features with zero risk."
            : isEnterprise
            ? "Power, customization, and dedicated support for pharmacy groups."
            : fallbackPlans[idx % 3].description),
        features: fList,
        popular: isPopular,
        isCustom: isEnterprise,
        isTrial,
      };
    });

    // Custom sorting: Free Demo first, then Starter, then Growth, then Enterprise/Custom
    formattedPlans.sort((a, b) => {
      const getPriority = (item: typeof a) => {
        if (item.isTrial) return 0;
        if (item.tier === "STARTER" || item.name.toLowerCase().includes("starter")) return 1;
        if (item.tier === "GROWTH" || item.name.toLowerCase().includes("growth")) return 2;
        if (item.isCustom || item.tier === "ENTERPRISE" || item.name.toLowerCase().includes("enterprise")) return 3;
        return 2;
      };
      return getPriority(a) - getPriority(b);
    });
  }

  const contactPhone = settings.contact?.phone || "01973590937";
  const cleanPhone = contactPhone.replace(/[^0-9]/g, "");
  const whatsappUrl = `https://wa.me/${cleanPhone.startsWith("88") ? cleanPhone : "88" + cleanPhone}?text=${encodeURIComponent("Hello BizPharma, I am interested in the Enterprise custom plan.")}`;

  return (
    <section className="section pricing-section" id="pricing">
      <div className="container">
        <div className="section-heading centered">
          <div className="kicker">{t("pricingKicker")}</div>
          <h2>{t("pricingTitle")}</h2>
          <p>{t("pricingSubtitle")}</p>
          <div className="billing-toggle">
            <button
              type="button"
              className={!annual ? "active" : ""}
              onClick={() => setAnnual(false)}
            >
              {t("monthly")}
            </button>
            <button
              type="button"
              className={annual ? "active" : ""}
              onClick={() => setAnnual(true)}
            >
              {t("yearly")} <span>{t("save20Percent")}</span>
            </button>
          </div>
        </div>

        <div className="pricing-grid">
          {formattedPlans.map((plan) => {
            const price = annual ? Math.round(plan.price * 0.8) : plan.price;

            // Determine button title: "Choose {Plan Name}" or "Contact System Owner"
            const planDisplayName =
              lang === "bn"
                ? plan.isTrial
                  ? "ফ্রি ডেমো"
                  : plan.isCustom
                  ? "এন্টারপ্রাইজ"
                  : plan.name === "Starter"
                  ? "স্টার্টার"
                  : plan.name === "Growth"
                  ? "গ্রোথ"
                  : plan.name
                : plan.name;

            const buttonText = plan.isCustom
              ? t("contactOwner")
              : lang === "bn"
              ? `${t("choosePlanPrefix")} ${planDisplayName}`
              : `Choose ${planDisplayName}`;

            const displayDescription =
              lang === "bn" && descTranslations[plan.description]
                ? descTranslations[plan.description]
                : plan.description;

            return (
              <article
                className={`price-card ${plan.popular ? "popular" : ""}`}
                key={plan.id || plan.name}
              >
                {plan.popular && <div className="popular-badge">{t("mostPopular")}</div>}
                {plan.isCustom && <div className="custom-badge">{t("customTier")}</div>}

                <h3>{planDisplayName}</h3>
                <p>{displayDescription}</p>

                <div className="price">
                  {plan.isCustom ? (
                    <>
                      <strong>{t("customTier")}</strong>
                      <small>{t("tailoredForYou")}</small>
                    </>
                  ) : plan.isTrial ? (
                    <>
                      <span>৳</span>
                      <strong>0</strong>
                      <small>{t("freeTrialDose")}</small>
                    </>
                  ) : (
                    <>
                      <span>৳</span>
                      <strong>{price.toLocaleString()}</strong>
                      <small>{t("perMonthUnit")}</small>
                    </>
                  )}
                </div>

                {annual && !plan.isCustom && !plan.isTrial && (
                  <div className="annual-note">
                    {t("billedYearlyPrefix")}{(price * 12).toLocaleString()}{t("billedYearlySuffix")}
                  </div>
                )}
                {(!annual || plan.isCustom || plan.isTrial) && (
                  <div className="annual-note" />
                )}

                {plan.isCustom ? (
                  <div>
                    <Link
                      className="button button-outline"
                      href="/contact"
                    >
                      {buttonText} <Icon name="arrow" size={18} />
                    </Link>
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="owner-whatsapp-link"
                    >
                      <MessageSquare className="h-4 w-4 text-emerald-600" />
                      <span>WhatsApp: {contactPhone}</span>
                    </a>
                  </div>
                ) : (
                  <Link
                    className={`button ${plan.popular ? "button-primary" : "button-outline"}`}
                    href={`/register?plan=${encodeURIComponent(plan.id)}`}
                  >
                    {buttonText} <Icon name="arrow" size={18} />
                  </Link>
                )}

                <div className="plan-divider" />
                <small>{t("whatsIncluded")}</small>
                <ul>
                  {plan.features.map((item) => (
                    <li key={item}>
                      <span>
                        <Icon name="check" size={15} />
                      </span>
                      {lang === "bn" && featureTranslations[item]
                        ? featureTranslations[item]
                        : item}
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>

        <p className="pricing-footnote">
          {t("pricingFootnote")}{" "}
          <Link href="/contact">{t("talkToTeam")}</Link>
        </p>
      </div>
    </section>
  );
}
