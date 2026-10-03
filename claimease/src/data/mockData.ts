import { ClaimDocument, Policy, ChatMessage } from '../types';

export const HOTLINK_IMAGES = {
  map: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBECFrkyv5RRc1rF5YMOT-A-z809kjAVlhRf_dKIk6dm-DQuBmz5t_qOCvDgrBM5XdpF3KK7gTCzzDjyjpSrk0oA6UAZgjJDCtgIfvP8W01klxJSM8R_L5MF31BvPxswxrKYNsWj8s5X0ljonE4CZneNGgMEhb0Ep69z19HnTxdesw5Vr8qmcKiL8rMknfSDTmAVR2dtfcnGr-f2X3dVxlVo_LzTcdxMDSyLhAdnyJXpOIrfnQwXKs',
  fir: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBxgsqZXO_4jv-V0l_6AP1L_RK1Ldp2Tew2-rqM30QTBZ_sgTGB4DQkDGKi6KoS_BOdmYuEEBYYBUv5Ow-Ibl8UuxJNcJ0U6x2s4bxQWOusZTca4OYycsFa6U7sJo8tOJ7hSiNh89-OlQnR0P5l6XUo9txH4leriyIWLRttHoKMvyx9tx60fRhrgptKOdnbuA05hr0iIjZYHIjPNZ0AIOPdd--xJoKUittyXU7uEsbLzRchyAC6THs',
  dl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB5hqekzKRQpyl2fpsCBCeCjwHBBjQj-tdyioNBlNNzRjAyI7ToT2MbWKZ7s_VO9zm9JYWMeQ1umlw0lRPR1FlaqCYWJiz7q1a0LyFtozjxm6QkrQxZbxYVF_VIPShk7a3qAq3XZt8SasNOzzcF8cz0R4BC_OLbuo_H5GhsUk0yhsv1EKfuQbGb8ol6qJy-1eRrT91kSmg4oASXWded1rKbnxqYw2b6RlWboaGwwr-nqerqLEXUuLg',
  rc: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAkTzTo3KFomlV2_YLM_j3bOX58dx_sk01T3_gAgB2chTfDRoIL0JpbNs6Td8e6lkk72K7l1pCF0ft6mmEg_PKT2TI9sKQ9SpnfmA2Y2GW43Vzes7qQnJek1dIlyKIMIKns0TecvJoWNgKS6nJckMqj9vyV8A1QLnEivS1wjUXETEXDKRVGdJcMECLWEmJT5GBTRaeGadSSq0KXWAF68GQeNULR1u4pa-yHndNUHyuLPBAuei_w3pk',
  estimate: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA35rAIIGYDJMyzjZ928TdJfOCV40No7QWTDWtR1m7HWMJVnJppqwCQXoe6uPD6H9kM532eByrovpXIf2_pJeZE7lkae3elHBmbfAXLe8qWaTXjpMuenhclga7NWSx3vxwZyMWFPlQXWtpqaHRL7jG1SP174-js4MC8HFJ3UPdBa3OO240qxcyZGWHSF3mdv0ID9iEJ6RzvYTwtjvV6uFxlxnIpnuwaQxjszp_mLv0g8O2mc80bBRk',
  inspectionLot: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC9GLTf9d_Y3bBOzbQXiCua8ka5VZ4Cjy4uM8kfSmrMSc8Pbgs0crSu0ogyfa2emVLJMJ3IAE09snHkd0eTs0hgWSd30pHS46WSBbpiIXk6rTeWqnWalzCSx5EdHmNdqpVdDxzKKsi3YtsptpAu5dMhAaYHxMTM6z55AOxZpQbo7lUZnNBsEaD5y5dVnCvJmzSgl_FKyN6hIB_mw-kUSQtR5DTopxD7kox2relrPPusL-KTqIckTDc',
  scannerRC: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCCHhzFsIEwYVr4JSOe9QmggINhcuZlaQ_Ek_cC-uLEwZzYgBZuLOxz356Szq0_yIL_c9flOjwEYtFPEhU8eVi75qYF2dICg5Y50Btexp8IcByUmp1Ex4c1VS4Q_i6PHi0Z8n6MfGhwHVrtPFqolyRQJHT23GKrXPznSu-W4QmD8ZjV2POI5j6Heoy643Y786V6vytSis7qiEJCOb5rwIWaMynKIlruGDHLZV2F-2E8aVimWwKjMLE',
  firDetail: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAK7-OLFHUEva4xSLcZmBDUaX4tiJDxbymXufMv67K3lEEHmimABsUY4xJnzuvxijI857pQNknw69HHufl1_eVGwfYqtJyth91JflpqvfiSHlC6SsogfWYui90pg3QSeLh-4bmwgAOsNPkuBvXxZKr0Z_ClcIhB5YQTpSXvdu9KaezScVJfFe4dYqoJVcH1Gtag1K4tp6A4CzXFA-_ddHTYOy55OWqlLcs3-bEWNpo-LqAKvzVWE4o',
  medicalSlip: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDZ_KvPwOEGs4SfoVtxS5up6xJaWrx6lFhzn2hhMBwa8NSDhdmOKYFFu73LnUADh7w8cjPRZdU9L6MvYTYzKaWWMes6WeKe7fDV9hgcvNO8H6KUj3Cdzo6US4CDMm3Qdw54uQFQImqRqXF7POmYi82bwJbRbak3CVtglM1mBem2e7fRZ21rQX4mgDx0aptFP5WsTwLXI2s7kcqOQ0eUavnK66wPlH_TlBr5uU-2GVUOSQmMuVw0b7M'
};

export const MOCK_POLICIES: Policy[] = [
  {
    id: 'p-1',
    policyNumber: 'MOT-9284-IN',
    carrier: 'HDFC ERGO General Insurance Co. Ltd.',
    productName: 'Comprehensive Private Car Package',
    vehicle: {
      makeModel: '2022 Hyundai Creta SX(O) Turbo',
      registration: 'DL 01 AB 8392',
      chassis: 'MA3ERB4910884920B'
    },
    coverageTier: 'Comprehensive B2B (Zero Depreciation)',
    status: 'in-progress',
    deductible: '₹1,000 Standard Compulsory',
    hasZeroDep: true,
    activeClaimId: 'CLM-9284-01'
  },
  {
    id: 'p-2',
    policyNumber: 'HLT-4491-DEL',
    carrier: 'Care Health Insurance',
    productName: 'Care Supreme Family Floater',
    coverageTier: 'Cashless & Reimbursement (Global OPD)',
    status: 'active',
    deductible: 'Zero Co-Pay',
    hasZeroDep: false,
    sumInsured: '₹15,00,000'
  },
  {
    id: 'p-3',
    policyNumber: 'TRV-8820-24',
    carrier: 'Tata AIG General Insurance',
    productName: 'Domestic Travel Guard',
    coverageTier: 'Flight & Baggage Delay Shield',
    status: 'settled',
    deductible: 'Nil',
    hasZeroDep: false
  }
];

export const MOCK_DOCUMENTS: ClaimDocument[] = [
  {
    id: 'doc-fir',
    name: 'FIR (First Information Report)',
    code: 'POL-FIR-01',
    category: 'Motor',
    required: true,
    status: 'pending',
    fileName: 'fir_scan_final.pdf',
    fileSize: '1.4 MB',
    fileType: 'PDF',
    ocrConfidence: 96.2,
    uploadedDate: '10 Sep 2024',
    description: 'Records the official details of the reported accident, incident timestamp, and initial jurisdictional findings.',
    mandateReason: 'Mandatory under Indian Motor Tariff for structural collision and third-party impact assessment before surveyor sign-off.',
    specimenImageUrl: HOTLINK_IMAGES.fir
  },
  {
    id: 'doc-dl',
    name: 'Driving Licence (Both Sides)',
    code: 'ID-DL-02',
    category: 'Motor',
    required: true,
    status: 'verified',
    fileName: 'dl_front_back.png',
    fileSize: '2.1 MB',
    fileType: 'PNG',
    ocrConfidence: 99.4,
    uploadedDate: '10 Sep 2024',
    description: "Confirms the driver's authorization and category validity at the precise timestamp of the reported collision.",
    mandateReason: 'Section 3 of Motor Vehicles Act mandates valid licensing at time of incident.',
    specimenImageUrl: HOTLINK_IMAGES.dl,
    notes: 'Valid till 2031 • Class LMV match'
  },
  {
    id: 'doc-rc',
    name: 'Vehicle Registration Certificate (RC)',
    code: 'VEH-RC-03',
    category: 'Motor',
    required: true,
    status: 'missing',
    fileName: 'RC Smart Card (DL-10-CK-4022).pdf',
    fileSize: '850 KB',
    fileType: 'PDF',
    description: 'Confirms the registered owner, chassis number, engine number, and state-certified roadworthiness.',
    mandateReason: 'Validates insurable interest and non-transfer of ownership throughout the policy coverage duration.',
    specimenImageUrl: HOTLINK_IMAGES.rc
  },
  {
    id: 'doc-estimate',
    name: 'Repair Estimate / Quotation',
    code: 'WRK-EST-04',
    category: 'Motor',
    required: true,
    status: 'missing',
    fileName: 'Initial Repair Estimate (₹54,200).pdf',
    fileSize: '1.2 MB',
    fileType: 'PDF',
    description: 'Itemized breakdown from an authorized cashless garage showing labor hours, parts replacement, and paint expenses.',
    mandateReason: 'Establishes preliminary Loss Reserve to expedite instantaneous surveyor sign-off.',
    specimenImageUrl: HOTLINK_IMAGES.estimate
  },
  {
    id: 'doc-photos',
    name: 'Vehicle Damage Photos (4 Angles)',
    code: 'VIS-PHOTO-05',
    category: 'Motor',
    required: false,
    status: 'verified',
    fileName: 'damage_photos_pack.zip',
    fileSize: '4.8 MB',
    fileType: 'ZIP',
    description: 'Multi-angle photographs capturing license plate, odometer, point of impact, and clear damage context.',
    mandateReason: 'Enables preliminary remote AI survey and pre-authorizes paint and panel replacement parts.',
    specimenImageUrl: HOTLINK_IMAGES.inspectionLot
  },
  {
    id: 'doc-policy',
    name: 'Insurance Policy Schedule',
    code: 'INS-POL-06',
    category: 'Motor',
    required: true,
    status: 'verified',
    fileName: 'HDFC_ERGO_Schedule_MOT9284.pdf',
    fileSize: '620 KB',
    fileType: 'PDF',
    description: 'Confirms active policy tenure, premium clearance, zero depreciation endorsements, and deductible clauses.',
    mandateReason: 'Section 64-VB compliance requirement proving timely premium remittance.',
    specimenImageUrl: HOTLINK_IMAGES.inspectionLot
  }
];

export const INITIAL_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-1',
    sender: 'user',
    timestamp: '10:42 AM',
    text: "What is this FIR? I've never heard of it. How do I get one? I think I've seen something like this when my chachu was admitted, but I'm not sure."
  },
  {
    id: 'msg-2',
    sender: 'assistant',
    timestamp: '10:42 AM',
    text: "FIR stands for First Information Report. It is a formal document prepared by police personnel after receiving information about the occurrence of a cognizable offense or serious road collision. It establishes official date, venue, vehicles involved, and incident narrative.\n\nIf your road accident involved property damage, injury, or third-party vehicle collision, you can obtain a signed certified copy directly from the jurisdictional police station where the occurrence was reported, or download an authorized copy via your State CCTNS portal.\n\nRegarding your chachu's hospital document: That was most likely an Emergency Admission Form, Medico-Legal Certificate (MLC), or discharge slip. An FIR is exclusively issued by police authorities, not healthcare facilities. If you have that paperwork, tap below and I will verify it instantly.",
    groundingContext: {
      title: "Why I'm Showing You This",
      details: "You are currently preparing a Motor Insurance — Accident Damage claim, and the FIR is registered as a mandatory compliance prerequisite in Step 2. Insurers mandate this document to authenticate incident chronology and assess third-party indemnity before authorized garage estimate approval.",
      claimId: 'MOT-9284-IN',
      stepNumber: 2
    },
    suggestedQueries: [
      "How do I get an FIR from the police station?",
      "Is my existing paper the right FIR?",
      "Show me an FIR specimen",
      "Can cashless claim proceed without FIR?"
    ]
  }
];
