# IOS-D1 — App Store Connect Metadata Pack

This document is the copy-ready metadata pack for **IOS-D1** in Epic D (App Store Operations), scoped to Week 4 / Milestone M4.

It extends the IOS-B5 legal/support baseline in [`docs/mobile/app-store-connect-metadata.md`](./app-store-connect-metadata.md) with full listing content required for App Store Connect submission readiness.

---

## 1) App Information (copy-ready)

### App Name
- **Paxora Parish Center**

### Subtitle (optional but recommended)
- **Parish communication, events, and service**

### Promotional Text (optional)
- **Keep your parish connected with one shared place for weekly tasks, groups, announcements, events, and requests.**

### Short Description (for internal reuse / ad snippets)
- **A parish workspace for communication, events, service coordination, and member requests.**

### Full App Description (App Store description field)

**Paxora Parish Center** helps parish communities organize ministry life in one place.

Use it to coordinate weekly service, communicate in groups, publish announcements, and keep members aligned on events and responsibilities.

Key features:
- **This Week:** a clear weekly view of priorities and upcoming commitments.
- **Serve & Tasks:** assign, track, and complete parish and group responsibilities.
- **Calendar & Events:** manage parish events and RSVP participation.
- **Groups & Chat:** collaborate in ministry channels with structured discussions.
- **Announcements:** publish updates to the right audience.
- **Requests:** submit and manage parish support requests.

Paxora Parish Center is intended for active parish communities and parishioners invited by their parish administrators.

Support and policy links:
- Support: `https://<public-site-domain>/en/contact`
- Privacy Policy: `https://<public-site-domain>/en/privacy`
- Terms of Use: `https://<public-site-domain>/en/terms`

Account deletion is available in-app at **Profile → Delete account**.

---

## 2) Keywords (100-char target)

Use the following comma-separated keyword set in App Store Connect:

`parish,church,community,ministry,volunteer,events,calendar,tasks,announcements,groups`

Notes:
- Avoid duplicate words already in app name/category when possible.
- Keep this list synced with any brand or positioning updates from Product.

---

## 3) Category Recommendation

- **Primary Category:** `Social Networking`
- **Secondary Category:** `Productivity`

Rationale:
- Primary usage centers on member communication, group interaction, and announcements.
- Secondary fit reflects structured task coordination, event planning, and team workflows.

---

## 4) Age Rating Questionnaire (recommended answers + rationale)

Use these values when completing App Store Connect age rating prompts.

| ASC age-rating topic | Recommended answer | Rationale |
|---|---|---|
| Cartoon/Fantasy Violence | None | No gameplay or violent media focus. |
| Realistic Violence | None | App is a parish operations/communication platform. |
| Prolonged Graphic/Sadistic Realistic Violence | None | Not applicable. |
| Profanity or Crude Humor | Infrequent/Mild | User-generated chat and announcements can contain member text; scope is parish-member-only and account-gated. |
| Mature/Suggestive Themes | None | Not a dating/adult-content experience. |
| Sexual Content/Nudity | None | Not applicable to intended product usage. |
| Horror/Fear Themes | None | Not applicable. |
| Medical/Treatment Information | None | No medical diagnosis/treatment functionality. |
| Alcohol, Tobacco, or Drug Use/References | None | Not a substance-focused app. |
| Gambling/Contests | None | No gambling mechanics. |
| Simulated Gambling | None | Not applicable. |
| Unrestricted Web Access | No | App does not provide general-purpose web browsing for users. |
| User-Generated Content | Yes | Group chat/messages/announcements are member-generated within parish context. |
| Advertising | No | No third-party ad network behavior in scope. |

**Expected resulting rating:** **4+** (subject to Apple final determination).

Moderation/safety context for review consistency:
- Access is account-gated and parish-scoped.
- Support issues can be escalated through support channels.
- Account deletion is available in-app (Profile flow).

---

## 5) App Privacy Labels (Nutrition Label Draft)

Use this as the initial App Privacy questionnaire matrix in App Store Connect. Reconfirm against current production behavior before final submission.

| Data type (ASC) | Collected | Linked to user | Tracking | Purpose in ASC terms | Notes |
|---|---|---|---|---|---|
| Contact Info (Email Address) | Yes | Yes | No | App Functionality, Account Management, Developer Communications | Used for sign-in/account support and support follow-up. |
| User Content (Messages, announcements, request text, attachments metadata) | Yes | Yes | No | App Functionality | Required for core parish communication/workflow features. |
| Identifiers (User ID, parish membership IDs) | Yes | Yes | No | App Functionality, Account Management | Internal app identity and tenancy isolation. |
| Usage Data (feature interaction events for product operations) | No | No | No | N/A | Keep set to not collected unless Product/Eng introduce analytics. |
| Diagnostics (crash/error telemetry) | No (current baseline) | No | No | N/A | If IOS-C1 monitoring is enabled before release, update ASC labels in same release cycle. |
| Purchases / Financial data | No | No | No | N/A | Donations/payments are out of app scope for iOS baseline behavior. |
| Location (Precise/Coarse) | No | No | No | N/A | Not required for core functionality. |
| Contacts / Photos / Health / Sensitive Info | No (except explicit attachment workflow permissions where applicable) | No | No | N/A | Reconfirm permission prompts align with actual feature use. |

Privacy label completion guardrails:
1. Mark data as collected only if transmitted/stored by app backend.
2. Mark as linked when data is associated with authenticated account identity.
3. Keep tracking = **No** unless cross-app/third-party tracking is introduced.

---

## 6) App Review Notes Template

Paste and customize for each submission:

> **App purpose**
> Paxora Parish Center is a parish community operations app used by invited parish members for communication, events, tasks, announcements, and support requests.
>
> **Who can access**
> The app is account-gated and used by parish communities with role-based access.
>
> **Account deletion**
> Users can delete their account in-app via **Profile → Delete account** by typing `DELETE` to confirm. Deletion support is available at **support@paxora.com**.
>
> **Support and legal**
> Support URL: `https://<public-site-domain>/en/contact`
> Privacy Policy: `https://<public-site-domain>/en/privacy`
> Terms: `https://<public-site-domain>/en/terms`
>
> **Giving/donation behavior context**
> In iOS native shell mode, external donation/payment shortcuts are suppressed by policy-safe configuration.
> When `NEXT_PUBLIC_IOS_SAFE_GIVING_STRATEGY=hide_in_ios_native` and `NEXT_PUBLIC_IOS_NATIVE_SHELL=true`, the giving shortcut API returns `shortcut: null` and no giving shortcut is rendered.
>
> **Test account (if required by reviewer)**
> Email: `<review-test-account-email>`
> Password: `<review-test-account-password>`
> Parish context: `<parish-name>`

---

## 7) IOS-B5 Canonical Values Reuse (must remain consistent)

Source of truth: [`docs/mobile/app-store-connect-metadata.md`](./app-store-connect-metadata.md)

- **Support URL:** `https://<public-site-domain>/en/contact`
- **Support email:** `support@paxora.com`
- **Privacy policy URL:** `https://<public-site-domain>/en/privacy`
- **Terms URL:** `https://<public-site-domain>/en/terms`
- **Account deletion discoverability reference:** `https://<public-site-domain>/en/profile`
- **Deletion summary alignment:** user-initiated deletion via Profile with confirmation token and retained historical parish records reassigned to Deleted User.

If any value above changes, update both IOS-B5 baseline doc and this IOS-D1 pack in the same PR.

---

## 8) ASC Field Mapping Table (source, owner, status)

| App Store Connect field | Value source | Owner | Status |
|---|---|---|---|
| App Name | This doc §1 | Product | Ready |
| Subtitle | This doc §1 | Product | Ready |
| Promotional Text | This doc §1 | Product | Ready |
| Description | This doc §1 | Product + Legal | Ready |
| Keywords | This doc §2 | Product | Ready |
| Primary Category | This doc §3 | Product | Ready |
| Secondary Category | This doc §3 | Product | Ready |
| Age Rating answers | This doc §4 | Product + Legal | Ready (final confirm in ASC questionnaire) |
| App Privacy labels | This doc §5 | Legal + Eng | Ready |
| Support URL | IOS-B5 canonical doc | Legal | Ready |
| Marketing URL (if used) | Public site domain | Product | Pending per launch domain confirmation |
| Privacy Policy URL | IOS-B5 canonical doc | Legal | Ready |
| Terms of Use URL | IOS-B5 canonical doc | Legal | Ready |
| App Review Notes | This doc §6 | Product + Legal + Eng | Ready (fill test credentials per build) |
| Account deletion reference | IOS-B5 canonical doc + this doc §7 | Legal + Eng | Ready |

---

## 9) Pre-Submission Validation Checklist

Before submitting build to TestFlight/App Review:

- [ ] App name/subtitle/description in ASC exactly match approved copy from this doc.
- [ ] Keywords string pasted as comma-separated list and within ASC character limits.
- [ ] Categories set to **Social Networking** (primary) and **Productivity** (secondary), unless Product approves change.
- [ ] Age rating questionnaire answers entered per §4 and reviewed by Legal.
- [ ] Privacy label answers revalidated against current release behavior (especially if analytics/diagnostics are enabled).
- [ ] Support URL, support email, privacy URL, and terms URL match IOS-B5 canonical values.
- [ ] Account deletion language in review notes matches in-app behavior and IOS-B5 summary.
- [ ] App Review Notes include current build test account credentials and parish context.
- [ ] Giving behavior note is included and remains iOS policy-safe.
- [ ] Final metadata proofread completed by Product + Legal before pressing Submit.

---

## 10) How Product/Legal uses this pack

1. Open ASC app record and keep this document side-by-side.
2. Copy/paste fields from sections 1–6 into matching ASC fields.
3. Validate legal/support URLs and deletion wording against section 7 (IOS-B5 canonical values).
4. Use the field mapping table (section 8) to confirm ownership and any pending inputs.
5. Run the checklist (section 9) before TestFlight submission and again before production submission.

## 11) Deferred follow-ups (outside IOS-D1)

- **IOS-D2:** Screenshot generation/checklist pipeline is tracked separately and not covered by this metadata pack.
- **IOS-D4:** CI lane for iOS build validation + artifact upload notes is tracked separately and not covered by this metadata pack.
