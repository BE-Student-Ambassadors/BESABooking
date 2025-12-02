
// Mock data
// export const mockTours = [
//   {
//     id: 1,
//     title: 'Baskin Engineering Group In-Person Tours',
//     duration: '1 Hour',
//     maxAttendees: 5,
//     description: 'This is an in-person tour of the Jack Baskin Engineering Building, led by the Baskin Engineering Student Ambassadors. During the tour, we will explore key areas that define the engineering experience at UCSC, such as classes, advising, research, student clubs, and more. You will also get a look inside Slugworks, our student-focused makerspace in the Baskin basement!',
//     available: true,
//     frequency: 'Every Hour',
//     break: 'None',
//     timeRange: 'Monday - Friday, 9:00 AM - 5:00 PM',
//     startDate: '2024-01-01',
//     endDate: '2024-12-31',
//     notice: 'Please arrive 10 minutes early to check in at the Baskin Engineering front desk.',
//     location: 'Jack Baskin Engineering Building, UCSC',
//     zoomLink: '',
//     holidayHours: 'Closed on university holidays'
//   },
//   {
//     id: 2,
//     title: 'Baskin Engineering Group Virtual Tours',
//     duration: '1 Hour',
//     maxAttendees: 8,
//     description: 'The virtual tour is hosted via Zoom and features a presentation led by our BESA ambassadors. You will get an overview of the Baskin Engineering building, detailed information on the majors offered under Baskin, and an introduction to student clubs and organizations within Baskin. The session ends with time for questions, so you can engage directly with our ambassadors.',
//     available: true,
//     frequency: '',
//     break: 'None',
//     timeRange: 'Monday - Friday, 9:00 AM - 5:00 PM',
//     startDate: '2024-01-01',
//     endDate: '2024-12-31',
//     notice: 'Please arrive 10 minutes early to check in at the Baskin Engineering front desk.',
//     location: 'Jack Baskin Engineering Building, UCSC',
//     zoomLink: '',
//     holidayHours: 'Closed on university holidays'
//   },
//   {
//     id: 3,
//     title: 'Baskin Engineering Large In-Person Tours (10+ attendees)',
//     duration: '2 Hours',
//     maxAttendees: 50,
//     description: 'This is a UCSC Baskin Engineering Large In Person Tours (For groups of more than 10) provided by the Baskin Engineering Student Ambassadors. This page is for those who are wanting to book this tour for a class. Please do not book this unless your group has more than 10 people.',
//     available: true,
//     frequency: '',
//     break: 'None',
//     timeRange: 'Monday - Friday, 9:00 AM - 5:00 PM',
//     startDate: '2024-01-01',
//     endDate: '2024-12-31',
//     notice: 'Please arrive 10 minutes early to check in at the Baskin Engineering front desk.',
//     location: 'Jack Baskin Engineering Building, UCSC',
//     zoomLink: '',
//     holidayHours: 'Closed on university holidays'
//   },
//   {
//     id: 4,
//     title: 'Slugworks Group In-Person Tours',
//     duration: '40 minutes',
//     maxAttendees: 5,
//     description: 'Book a tour of Slugworks, UCSC’s student-focused makerspace in Baskin Engineering. Open to all undergraduates, it features a machine shop, Creatorspace, classroom, and club space — no engineering major required!',
//     available: true,
//     frequency: '',
//     break: 'None',
//     timeRange: 'Monday - Friday, 9:00 AM - 5:00 PM',
//     startDate: '2024-01-01',
//     endDate: '2024-12-31',
//     notice: 'Please arrive 10 minutes early to check in at the Baskin Engineering front desk.',
//     location: 'Jack Baskin Engineering Building, UCSC',
//     zoomLink: '',
//     holidayHours: 'Closed on university holidays'
//   },
//   {
//     id: 5,
//     title: 'BESAs Drop In Office Hours',
//     duration: '20 minutes',
//     maxAttendees: 5,
//     description: 'Book a one-on-one Virtual Office Hour with a BESA Ambassador to ask questions and learn more about Baskin Engineering.',
//     available: true,
//     frequency: '',
//     break: 'None',
//     timeRange: 'Monday - Friday, 9:00 AM - 5:00 PM',
//     startDate: '2024-01-01',
//     endDate: '2024-12-31',
//     notice: 'Please arrive 10 minutes early to check in at the Baskin Engineering front desk.',
//     location: 'Jack Baskin Engineering Building, UCSC',
//     zoomLink: '',
//     holidayHours: 'Closed on university holidays'
//   }
// ];

// export const mockBesas = [
//   {
//     id: 1,
//     name: 'Sarah Johnson',
//     email: 'sarah.j@university.edu',
//     role: 'BESA',
//     status: 'active',
//     toursThisWeek: 8,
//     totalTours: 147,
//     officeHours: {
//       monday: { start: '09:00', end: '17:00', available: true },
//       tuesday: { start: '09:00', end: '17:00', available: true },
//       wednesday: { start: '10:00', end: '16:00', available: true },
//       thursday: { start: '09:00', end: '17:00', available: true },
//       friday: { start: '09:00', end: '15:00', available: true },
//       saturday: { start: '', end: '', available: false },
//       sunday: { start: '', end: '', available: false }
//     }
//   },
//   {
//     id: 2,
//     name: 'Michael Chen',
//     email: 'michael.c@university.edu',
//     role: 'BESA Lead',
//     status: 'active',
//     toursThisWeek: 12,
//     totalTours: 203,
//     officeHours: {
//       monday: { start: '08:00', end: '16:00', available: true },
//       tuesday: { start: '08:00', end: '16:00', available: true },
//       wednesday: { start: '08:00', end: '16:00', available: true },
//       thursday: { start: '08:00', end: '16:00', available: true },
//       friday: { start: '08:00', end: '14:00', available: true },
//       saturday: { start: '10:00', end: '14:00', available: true },
//       sunday: { start: '', end: '', available: false }
//     }
//   },
//   {
//     id: 3,
//     name: 'Emma Rodriguez',
//     email: 'emma.r@university.edu',
//     role: 'BESA',
//     status: 'active',
//     toursThisWeek: 6,
//     totalTours: 89,
//     officeHours: {
//       monday: { start: '11:00', end: '19:00', available: true },
//       tuesday: { start: '11:00', end: '19:00', available: true },
//       wednesday: { start: '11:00', end: '19:00', available: true },
//       thursday: { start: '11:00', end: '19:00', available: true },
//       friday: { start: '11:00', end: '17:00', available: true },
//       saturday: { start: '', end: '', available: false },
//       sunday: { start: '12:00', end: '16:00', available: true }
//     }
//   },
//   {
//     id: 4,
//     name: 'Arely Rosendes',
//     email: 'emma.r@university.edu',
//     role: 'BESA',
//     status: 'active',
//     toursThisWeek: 6,
//     totalTours: 89,
//     officeHours: {
//       monday: { start: '11:00', end: '19:00', available: true },
//       tuesday: { start: '11:00', end: '19:00', available: true },
//       wednesday: { start: '', end: '', available: false },
//       thursday: { start: '11:00', end: '19:00', available: true },
//       friday: { start: '11:00', end: '17:00', available: true },
//       saturday: { start: '', end: '', available: false },
//       sunday: { start: '12:00', end: '16:00', available: true }
//     }
//   },
//   {
//     id: 5,
//     name: 'Nataniel J',
//     email: 'emma.r@university.edu',
//     role: 'BESA',
//     status: 'active',
//     toursThisWeek: 6,
//     totalTours: 89,
//     officeHours: {
//       monday: { start: '11:00', end: '19:00', available: true },
//       tuesday: { start: '11:00', end: '19:00', available: true },
//       wednesday: { start: '11:00', end: '19:00', available: true },
//       thursday: { start: '11:00', end: '19:00', available: true },
//       friday: { start: '11:00', end: '17:00', available: true },
//       saturday: { start: '', end: '', available: false },
//       sunday: { start: '12:00', end: '16:00', available: true }
//     }
//   }
// ];

export const mockBookings = [
  {
    id: 1,
    tourType: 'Baskin Engineering Group In-Person Tours',
    date: '07-23-2025',
    time: '10:00 AM',
    attendees: 12,
    maxAttendees: 15,
    besa: 'Sarah Johnson',
    status: 'confirmed',
    contactName: 'Jennifer Davis',
    contactEmail: 'j.davis@email.com',
    contactPhone: '(555) 123-4567'
  },
  {
    id: 2,
    tourType: 'Baskin Engineering Group Virtual Tours',
    date: '06-15-2025',
    time: '2:00 PM',
    attendees: 6,
    maxAttendees: 8,
    besa: 'Michael Chen',
    status: 'confirmed',
    contactName: 'Robert Wilson',
    contactEmail: 'r.wilson@email.com',
    contactPhone: '(555) 987-6543'
  },
  {
    id: 3,
    tourType: 'Slugworks Group In-Person Tours',
    date: '06-15-2025',
    time: '11:00 AM',
    attendees: 8,
    maxAttendees: 12,
    besa: 'Emma Rodriguez',
    status: 'pending',
    contactName: 'Lisa Anderson',
    contactEmail: 'l.anderson@email.com',
    contactPhone: '(555) 456-7890'
  }
];


