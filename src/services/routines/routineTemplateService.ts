import type { RoutineTemplate } from "../../types/routineTemplate";

const routineTemplates: RoutineTemplate[] = [
  {
    id: "morning-basics",
    title: "Sabah başlangıç rutini",
    description: "Güne su, vitamin ve kısa yürüyüş ile dengeli başlamak için.",
    items: [
      {
        title: "Su iç",
        category: "water",
        description: "Güne ilk bardak su ile başla.",
        frequencyType: "daily",
        scheduledTime: "08:00",
        reminderEnabled: true,
      },
      {
        title: "Vitamin al",
        category: "vitamin",
        description: "Sabah vitamin rutinini tamamla.",
        frequencyType: "daily",
        scheduledTime: "08:15",
        reminderEnabled: true,
      },
      {
        title: "Kısa yürüyüş",
        category: "walking",
        description: "10-15 dakikalık hafif yürüyüş yap.",
        frequencyType: "daily",
        scheduledTime: "08:30",
        reminderEnabled: false,
      },
    ],
  },
  {
    id: "study-focus",
    title: "Çalışma odak rutini",
    description: "Düzenli çalışma alışkanlığı kurmak için sade bir paket.",
    items: [
      {
        title: "Odaklı çalışma",
        category: "study",
        description: "En az 25 dakika odaklı çalışma yap.",
        frequencyType: "daily",
        scheduledTime: "19:00",
        reminderEnabled: true,
      },
      {
        title: "Kısa tekrar",
        category: "habit",
        description: "Bugün öğrendiğin konuları kısaca gözden geçir.",
        frequencyType: "daily",
        scheduledTime: "21:00",
        reminderEnabled: false,
      },
    ],
  },
  {
    id: "fitness-light",
    title: "Hafif spor rutini",
    description: "Spor alışkanlığına düşük sürtünmeyle başlamak için.",
    items: [
      {
        title: "Antrenman",
        category: "workout",
        description: "Kısa ve sürdürülebilir bir egzersiz yap.",
        frequencyType: "selected_days",
        daysOfWeek: [1, 3, 5],
        scheduledTime: "18:30",
        reminderEnabled: true,
      },
      {
        title: "Yürüyüş",
        category: "walking",
        description: "Dinlenme günlerinde tempolu yürüyüş yap.",
        frequencyType: "selected_days",
        daysOfWeek: [2, 4],
        scheduledTime: "18:30",
        reminderEnabled: false,
      },
    ],
  },
  {
    id: "health-basics",
    title: "Sağlık takip rutini",
    description: "İlaç, supplement ve su takibi için temel sağlık paketi.",
    items: [
      {
        title: "İlaç kontrolü",
        category: "medicine",
        description: "Günlük ilaç kullanımını kontrol et.",
        frequencyType: "daily",
        scheduledTime: "09:00",
        reminderEnabled: true,
      },
      {
        title: "Supplement al",
        category: "supplement",
        description: "Planındaki supplement rutinini tamamla.",
        frequencyType: "daily",
        scheduledTime: "09:15",
        reminderEnabled: true,
      },
      {
        title: "Su hedefi",
        category: "water",
        description: "Gün içindeki su hedefini takip et.",
        frequencyType: "daily",
        scheduledTime: "12:00",
        reminderEnabled: false,
      },
    ],
  },
];

export function listRoutineTemplates(): RoutineTemplate[] {
  return routineTemplates;
}
