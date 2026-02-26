import type { Locale } from "@/lib/i18n/config";

export type LegalSection = {
  heading: string;
  paragraphs: string[];
};

type LegalContent = {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
};

export const termsContent: Record<Locale, LegalContent> = {
  en: {
    title: "Terms of Service",
    updated: "Last updated: February 2026.",
    intro: "These Terms describe how Paxora Parish Center App is provided during the Early Access Partner Program.",
    sections: [
      {
        heading: "Service scope",
        paragraphs: [
          "Paxora supports parish coordination across This Week planning, service tasks, events, requests, groups, and communication.",
          "Features may change as we improve reliability and usability during early access."
        ]
      },
      {
        heading: "Acceptable use",
        paragraphs: [
          "You agree to use the service for lawful parish and community work.",
          "You must not attempt unauthorized access, interfere with service operations, or post harmful content."
        ]
      },
      {
        heading: "Roles and access",
        paragraphs: [
          "Parish leaders and delegated administrators manage member access and permissions.",
          "Paxora applies role-based access controls to protect parish data."
        ]
      },
      {
        heading: "Data ownership and processing",
        paragraphs: [
          "Each parish retains ownership of its data.",
          "Paxora processes data only to operate, secure, support, and improve the service."
        ]
      },
      {
        heading: "Account deletion and retained records",
        paragraphs: [
          "Members can delete their account from Profile → Delete account.",
          "Deletion removes login access and personal profile data. Parish records needed for operational continuity (for example, tasks, events, and messages) may be retained and reassigned to a deleted-user label."
        ]
      },
      {
        heading: "Availability and warranties",
        paragraphs: [
          "We aim for dependable service, but availability may vary and no uptime guarantee is provided during early access.",
          "To the extent allowed by law, the service is provided \"as is\" and \"as available\"."
        ]
      },
      {
        heading: "Support contact",
        paragraphs: ["For support or legal notices, contact support@paxora.com."]
      }
    ]
  },
  es: {
    title: "Términos del Servicio",
    updated: "Última actualización: febrero de 2026.",
    intro: "Estos Términos describen cómo se ofrece Paxora Parish Center App durante el Programa de Socios de Acceso Anticipado.",
    sections: [
      {
        heading: "Alcance del servicio",
        paragraphs: [
          "Paxora apoya la coordinación parroquial en planificación semanal, tareas de servicio, eventos, solicitudes, grupos y comunicación.",
          "Las funciones pueden cambiar mientras mejoramos la fiabilidad y la experiencia durante el acceso anticipado."
        ]
      },
      {
        heading: "Uso aceptable",
        paragraphs: [
          "Usted acepta usar el servicio para trabajo parroquial y comunitario legal.",
          "No debe intentar acceso no autorizado, interferir con la operación del servicio ni publicar contenido dañino."
        ]
      },
      {
        heading: "Roles y acceso",
        paragraphs: [
          "Los líderes parroquiales y administradores delegados gestionan el acceso y permisos de miembros.",
          "Paxora aplica controles de acceso basados en roles para proteger los datos de la parroquia."
        ]
      },
      {
        heading: "Propiedad y tratamiento de datos",
        paragraphs: [
          "Cada parroquia mantiene la propiedad de sus datos.",
          "Paxora trata los datos solo para operar, proteger, dar soporte y mejorar el servicio."
        ]
      },
      {
        heading: "Eliminación de cuenta y registros retenidos",
        paragraphs: [
          "Los miembros pueden eliminar su cuenta desde Perfil → Eliminar cuenta.",
          "La eliminación quita el acceso de inicio de sesión y los datos personales del perfil. Los registros parroquiales necesarios para continuidad operativa (por ejemplo, tareas, eventos y mensajes) pueden conservarse y reasignarse a una etiqueta de usuario eliminado."
        ]
      },
      {
        heading: "Disponibilidad y garantías",
        paragraphs: [
          "Buscamos un servicio confiable, pero la disponibilidad puede variar y no se ofrece garantía de tiempo de actividad durante el acceso anticipado.",
          "En la medida permitida por la ley, el servicio se proporciona \"tal cual\" y \"según disponibilidad\"."
        ]
      },
      {
        heading: "Contacto de soporte",
        paragraphs: ["Para soporte o avisos legales, contacte support@paxora.com."]
      }
    ]
  },
  uk: {
    title: "Умови користування",
    updated: "Оновлено: лютий 2026.",
    intro: "Ці Умови описують надання Paxora Parish Center App у межах партнерської програми раннього доступу.",
    sections: [
      {
        heading: "Обсяг сервісу",
        paragraphs: [
          "Paxora допомагає координувати парафіяльне служіння: тижневе планування, завдання, події, запити, групи та комунікацію.",
          "Функції можуть змінюватися в міру покращення надійності та зручності під час раннього доступу."
        ]
      },
      {
        heading: "Належне використання",
        paragraphs: [
          "Ви погоджуєтесь використовувати сервіс лише для законної парафіяльної та спільнотної діяльності.",
          "Заборонено намагатися отримати несанкціонований доступ, порушувати роботу сервісу або публікувати шкідливий контент."
        ]
      },
      {
        heading: "Ролі та доступ",
        paragraphs: [
          "Керівники парафії та призначені адміністратори керують доступом і правами учасників.",
          "Paxora застосовує рольовий контроль доступу для захисту парафіяльних даних."
        ]
      },
      {
        heading: "Власність і обробка даних",
        paragraphs: [
          "Кожна парафія зберігає право власності на свої дані.",
          "Paxora обробляє дані лише для роботи сервісу, безпеки, підтримки та покращення продукту."
        ]
      },
      {
        heading: "Видалення облікового запису та збережені записи",
        paragraphs: [
          "Користувач може видалити обліковий запис у Профіль → Видалити обліковий запис.",
          "Видалення прибирає доступ до входу та персональні дані профілю. Парафіяльні записи, потрібні для безперервності служіння (наприклад, завдання, події та повідомлення), можуть зберігатися та бути перепризначені на позначку видаленого користувача."
        ]
      },
      {
        heading: "Доступність і гарантії",
        paragraphs: [
          "Ми прагнемо стабільної роботи сервісу, але в період раннього доступу доступність може змінюватися, і гарантія безперервної роботи не надається.",
          "У межах, дозволених законом, сервіс надається \"як є\" та \"за наявності\"."
        ]
      },
      {
        heading: "Контакт підтримки",
        paragraphs: ["Для підтримки або юридичних звернень пишіть на support@paxora.com."]
      }
    ]
  }
};

export const privacyContent: Record<Locale, LegalContent> = {
  en: {
    title: "Privacy Policy",
    updated: "Last updated: February 2026.",
    intro: "This Policy explains how Paxora handles personal and parish data for the Early Access Partner Program.",
    sections: [
      {
        heading: "Information we collect",
        paragraphs: [
          "We collect account profile details, parish membership and role data, user-generated content, and technical logs needed to operate securely."
        ]
      },
      {
        heading: "How we use data",
        paragraphs: [
          "We use data to operate core workflows, secure accounts, provide support, send requested notifications, and improve product quality."
        ]
      },
      {
        heading: "Data ownership",
        paragraphs: ["Parishes retain ownership of parish data created in the service."]
      },
      {
        heading: "Data sharing and processors",
        paragraphs: [
          "We do not sell personal data.",
          "We use infrastructure, storage, and messaging providers only as needed to deliver the service."
        ]
      },
      {
        heading: "Security safeguards",
        paragraphs: [
          "We maintain administrative, technical, and organizational safeguards, including encryption in transit and role-based access controls."
        ]
      },
      {
        heading: "Deletion and retention",
        paragraphs: [
          "Members can request account deletion from Profile → Delete account.",
          "Deleted accounts lose sign-in access immediately. Personal profile data is removed, while parish operational records may be retained or anonymized for continuity and compliance needs."
        ]
      },
      {
        heading: "Support and privacy requests",
        paragraphs: ["For privacy requests, write to support@paxora.com."]
      }
    ]
  },
  es: {
    title: "Política de Privacidad",
    updated: "Última actualización: febrero de 2026.",
    intro: "Esta Política explica cómo Paxora trata datos personales y parroquiales para el Programa de Socios de Acceso Anticipado.",
    sections: [
      {
        heading: "Información que recopilamos",
        paragraphs: [
          "Recopilamos datos de perfil de cuenta, membresía y roles parroquiales, contenido generado por usuarios y registros técnicos necesarios para operar con seguridad."
        ]
      },
      {
        heading: "Cómo usamos los datos",
        paragraphs: [
          "Usamos los datos para operar flujos principales, proteger cuentas, brindar soporte, enviar notificaciones solicitadas y mejorar la calidad del producto."
        ]
      },
      {
        heading: "Propiedad de los datos",
        paragraphs: ["Las parroquias mantienen la propiedad de los datos parroquiales creados en el servicio."]
      },
      {
        heading: "Compartición de datos y encargados",
        paragraphs: [
          "No vendemos datos personales.",
          "Usamos proveedores de infraestructura, almacenamiento y mensajería solo cuando es necesario para prestar el servicio."
        ]
      },
      {
        heading: "Medidas de seguridad",
        paragraphs: [
          "Mantenemos medidas administrativas, técnicas y organizativas, incluyendo cifrado en tránsito y controles de acceso basados en roles."
        ]
      },
      {
        heading: "Eliminación y conservación",
        paragraphs: [
          "Los miembros pueden solicitar eliminación de cuenta desde Perfil → Eliminar cuenta.",
          "Las cuentas eliminadas pierden acceso de inmediato. Los datos personales del perfil se eliminan, mientras que los registros operativos parroquiales pueden conservarse o anonimizarse para continuidad y cumplimiento."
        ]
      },
      {
        heading: "Soporte y solicitudes de privacidad",
        paragraphs: ["Para solicitudes de privacidad, escriba a support@paxora.com."]
      }
    ]
  },
  uk: {
    title: "Політика конфіденційності",
    updated: "Оновлено: лютий 2026.",
    intro: "Ця Політика пояснює, як Paxora обробляє персональні та парафіяльні дані в межах партнерської програми раннього доступу.",
    sections: [
      {
        heading: "Які дані ми збираємо",
        paragraphs: [
          "Ми збираємо дані профілю облікового запису, інформацію про членство та ролі в парафії, контент користувачів і технічні журнали, необхідні для безпечної роботи сервісу."
        ]
      },
      {
        heading: "Як ми використовуємо дані",
        paragraphs: [
          "Ми використовуємо дані для роботи основних процесів, захисту облікових записів, підтримки користувачів, надсилання запитаних сповіщень і покращення якості продукту."
        ]
      },
      {
        heading: "Власність на дані",
        paragraphs: ["Парафії зберігають право власності на парафіяльні дані, створені в сервісі."]
      },
      {
        heading: "Передача даних і обробники",
        paragraphs: [
          "Ми не продаємо персональні дані.",
          "Ми використовуємо постачальників інфраструктури, зберігання та повідомлень лише настільки, наскільки це потрібно для надання сервісу."
        ]
      },
      {
        heading: "Заходи безпеки",
        paragraphs: [
          "Ми застосовуємо адміністративні, технічні та організаційні заходи захисту, зокрема шифрування під час передачі та рольовий контроль доступу."
        ]
      },
      {
        heading: "Видалення і зберігання",
        paragraphs: [
          "Користувач може подати запит на видалення облікового запису в Профіль → Видалити обліковий запис.",
          "Після видалення доступ до входу припиняється одразу. Персональні дані профілю видаляються, а парафіяльні операційні записи можуть зберігатися або анонімізуватися для безперервності служіння та вимог обліку."
        ]
      },
      {
        heading: "Підтримка і запити щодо конфіденційності",
        paragraphs: ["Для запитів щодо конфіденційності пишіть на support@paxora.com."]
      }
    ]
  }
};
