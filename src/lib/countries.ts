
export interface Country {
  code: string;
  name: string;
  currency: string;
  symbol: string;
}

export const COUNTRIES: Country[] = [
  { code: 'AF', name: 'Afghanistan', currency: 'AFN', symbol: '؋' },
  { code: 'AL', name: 'Albania', currency: 'ALL', symbol: 'L' },
  { code: 'DZ', name: 'Algeria', currency: 'DZD', symbol: 'د.ج' },
  { code: 'AD', name: 'Andorra', currency: 'EUR', symbol: '€' },
  { code: 'AO', name: 'Angola', currency: 'AOA', symbol: 'Kz' },
  { code: 'AG', name: 'Antigua and Barbuda', currency: 'XCD', symbol: '$' },
  { code: 'AR', name: 'Argentina', currency: 'ARS', symbol: '$' },
  { code: 'AM', name: 'Armenia', currency: 'AMD', symbol: '֏' },
  { code: 'AU', name: 'Australia', currency: 'AUD', symbol: '$' },
  { code: 'AT', name: 'Austria', currency: 'EUR', symbol: '€' },
  { code: 'AZ', name: 'Azerbaijan', currency: 'AZN', symbol: '₼' },
  { code: 'BS', name: 'Bahamas', currency: 'BSD', symbol: '$' },
  { code: 'BH', name: 'Bahrain', currency: 'BHD', symbol: '.د.ب' },
  { code: 'BD', name: 'Bangladesh', currency: 'BDT', symbol: '৳' },
  { code: 'BB', name: 'Barbados', currency: 'BBD', symbol: '$' },
  { code: 'BY', name: 'Belarus', currency: 'BYN', symbol: 'Br' },
  { code: 'BE', name: 'Belgium', currency: 'EUR', symbol: '€' },
  { code: 'BZ', name: 'Belize', currency: 'BZD', symbol: '$' },
  { code: 'BJ', name: 'Benin', currency: 'XOF', symbol: 'CFA' },
  { code: 'BT', name: 'Bhutan', currency: 'BTN', symbol: 'Nu.' },
  { code: 'BO', name: 'Bolivia', currency: 'BOB', symbol: 'Bs.' },
  { code: 'BA', name: 'Bosnia and Herzegovina', currency: 'BAM', symbol: 'KM' },
  { code: 'BW', name: 'Botswana', currency: 'BWP', symbol: 'P' },
  { code: 'BR', name: 'Brazil', currency: 'BRL', symbol: 'R$' },
  { code: 'BN', name: 'Brunei Darussalam', currency: 'BND', symbol: '$' },
  { code: 'BG', name: 'Bulgaria', currency: 'BGN', symbol: 'лв' },
  { code: 'BF', name: 'Burkina Faso', currency: 'XOF', symbol: 'CFA' },
  { code: 'BI', name: 'Burundi', currency: 'BIF', symbol: 'FBu' },
  { code: 'CV', name: 'Cabo Verde', currency: 'CVE', symbol: 'Esc' },
  { code: 'KH', name: 'Cambodia', currency: 'KHR', symbol: '៛' },
  { code: 'CM', name: 'Cameroon', currency: 'XAF', symbol: 'FCFA' },
  { code: 'CA', name: 'Canada', currency: 'CAD', symbol: '$' },
  { code: 'CF', name: 'Central African Republic', currency: 'XAF', symbol: 'FCFA' },
  { code: 'TD', name: 'Chad', currency: 'XAF', symbol: 'FCFA' },
  { code: 'CL', name: 'Chile', currency: 'CLP', symbol: '$' },
  { code: 'CN', name: 'China', currency: 'CNY', symbol: '¥' },
  { code: 'CO', name: 'Colombia', currency: 'COP', symbol: '$' },
  { code: 'KM', name: 'Comoros', currency: 'KMF', symbol: 'CF' },
  { code: 'CG', name: 'Congo', currency: 'XAF', symbol: 'FCFA' },
  { code: 'CD', name: 'Congo, Democratic Republic of the', currency: 'CDF', symbol: 'FC' },
  { code: 'CR', name: 'Costa Rica', currency: 'CRC', symbol: '₡' },
  { code: 'CI', name: "Côte d'Ivoire", currency: 'XOF', symbol: 'CFA' },
  { code: 'HR', name: 'Croatia', currency: 'EUR', symbol: '€' },
  { code: 'CU', name: 'Cuba', currency: 'CUP', symbol: '$' },
  { code: 'CY', name: 'Cyprus', currency: 'EUR', symbol: '€' },
  { code: 'CZ', name: 'Czech Republic', currency: 'CZK', symbol: 'Kč' },
  { code: 'DK', name: 'Denmark', currency: 'DKK', symbol: 'kr' },
  { code: 'DJ', name: 'Djibouti', currency: 'DJF', symbol: 'Fdj' },
  { code: 'DM', name: 'Dominica', currency: 'XCD', symbol: '$' },
  { code: 'DO', name: 'Dominican Republic', currency: 'DOP', symbol: '$' },
  { code: 'EC', name: 'Ecuador', currency: 'USD', symbol: '$' },
  { code: 'EG', name: 'Egypt', currency: 'EGP', symbol: 'E£' },
  { code: 'SV', name: 'El Salvador', currency: 'USD', symbol: '$' },
  { code: 'GQ', name: 'Equatorial Guinea', currency: 'XAF', symbol: 'FCFA' },
  { code: 'ER', name: 'Eritrea', currency: 'ERN', symbol: 'Nfk' },
  { code: 'EE', name: 'Estonia', currency: 'EUR', symbol: '€' },
  { code: 'SZ', name: 'Eswatini', currency: 'SZL', symbol: 'L' },
  { code: 'ET', name: 'Ethiopia', currency: 'ETB', symbol: 'Br' },
  { code: 'EU', name: 'European Union', currency: 'EUR', symbol: '€' },
  { code: 'FJ', name: 'Fiji', currency: 'FJD', symbol: '$' },
  { code: 'FI', name: 'Finland', currency: 'EUR', symbol: '€' },
  { code: 'FR', name: 'France', currency: 'EUR', symbol: '€' },
  { code: 'GA', name: 'Gabon', currency: 'XAF', symbol: 'FCFA' },
  { code: 'GM', name: 'Gambia', currency: 'GMD', symbol: 'D' },
  { code: 'GE', name: 'Georgia', currency: 'GEL', symbol: '₾' },
  { code: 'DE', name: 'Germany', currency: 'EUR', symbol: '€' },
  { code: 'GH', name: 'Ghana', currency: 'GHS', symbol: '₵' },
  { code: 'GR', name: 'Greece', currency: 'EUR', symbol: '€' },
  { code: 'GD', name: 'Grenada', currency: 'XCD', symbol: '$' },
  { code: 'GT', name: 'Guatemala', currency: 'GTQ', symbol: 'Q' },
  { code: 'GN', name: 'Guinea', currency: 'GNF', symbol: 'FG' },
  { code: 'GW', name: 'Guinea-Bissau', currency: 'XOF', symbol: 'CFA' },
  { code: 'GY', name: 'Guyana', currency: 'GYD', symbol: '$' },
  { code: 'HT', name: 'Haiti', currency: 'HTG', symbol: 'G' },
  { code: 'HN', name: 'Honduras', currency: 'HNL', symbol: 'L' },
  { code: 'HK', name: 'Hong Kong', currency: 'HKD', symbol: '$' },
  { code: 'HU', name: 'Hungary', currency: 'HUF', symbol: 'Ft' },
  { code: 'IS', name: 'Iceland', currency: 'ISK', symbol: 'kr' },
  { code: 'IN', name: 'India', currency: 'INR', symbol: '₹' },
  { code: 'ID', name: 'Indonesia', currency: 'IDR', symbol: 'Rp' },
  { code: 'IR', name: 'Iran', currency: 'IRR', symbol: '﷼' },
  { code: 'IQ', name: 'Iraq', currency: 'IQD', symbol: 'ع.د' },
  { code: 'IE', name: 'Ireland', currency: 'EUR', symbol: '€' },
  { code: 'IL', name: 'Israel', currency: 'ILS', symbol: '₪' },
  { code: 'IT', name: 'Italy', currency: 'EUR', symbol: '€' },
  { code: 'JM', name: 'Jamaica', currency: 'JMD', symbol: '$' },
  { code: 'JP', name: 'Japan', currency: 'JPY', symbol: '¥' },
  { code: 'JO', name: 'Jordan', currency: 'JOD', symbol: 'د.ا' },
  { code: 'KZ', name: 'Kazakhstan', currency: 'KZT', symbol: '₸' },
  { code: 'KE', name: 'Kenya', currency: 'KES', symbol: 'KSh' },
  { code: 'KI', name: 'Kiribati', currency: 'AUD', symbol: '$' },
  { code: 'KW', name: 'Kuwait', currency: 'KWD', symbol: 'د.ك' },
  { code: 'KG', name: 'Kyrgyzstan', currency: 'KGS', symbol: 'с' },
  { code: 'LA', name: 'Laos', currency: 'LAK', symbol: '₭' },
  { code: 'LV', name: 'Latvia', currency: 'EUR', symbol: '€' },
  { code: 'LB', name: 'Lebanon', currency: 'LBP', symbol: 'ل.ل' },
  { code: 'LS', name: 'Lesotho', currency: 'LSL', symbol: 'L' },
  { code: 'LR', name: 'Liberia', currency: 'LRD', symbol: '$' },
  { code: 'LY', name: 'Libya', currency: 'LYD', symbol: 'ل.د' },
  { code: 'LI', name: 'Liechtenstein', currency: 'CHF', symbol: 'CHF' },
  { code: 'LT', name: 'Lithuania', currency: 'EUR', symbol: '€' },
  { code: 'LU', name: 'Luxembourg', currency: 'EUR', symbol: '€' },
  { code: 'MG', name: 'Madagascar', currency: 'MGA', symbol: 'Ar' },
  { code: 'MW', name: 'Malawi', currency: 'MWK', symbol: 'MK' },
  { code: 'MY', name: 'Malaysia', currency: 'MYR', symbol: 'RM' },
  { code: 'MV', name: 'Maldives', currency: 'MVR', symbol: '.ރ' },
  { code: 'ML', name: 'Mali', currency: 'XOF', symbol: 'CFA' },
  { code: 'MT', name: 'Malta', currency: 'EUR', symbol: '€' },
  { code: 'MH', name: 'Marshall Islands', currency: 'USD', symbol: '$' },
  { code: 'MR', name: 'Mauritania', currency: 'MRU', symbol: 'UM' },
  { code: 'MU', name: 'Mauritius', currency: 'MUR', symbol: '₨' },
  { code: 'MX', name: 'Mexico', currency: 'MXN', symbol: '$' },
  { code: 'FM', name: 'Micronesia', currency: 'USD', symbol: '$' },
  { code: 'MD', name: 'Moldova', currency: 'MDL', symbol: 'L' },
  { code: 'MC', name: 'Monaco', currency: 'EUR', symbol: '€' },
  { code: 'MN', name: 'Mongolia', currency: 'MNT', symbol: '₮' },
  { code: 'ME', name: 'Montenegro', currency: 'EUR', symbol: '€' },
  { code: 'MA', name: 'Morocco', currency: 'MAD', symbol: 'د.م.' },
  { code: 'MZ', name: 'Mozambique', currency: 'MZN', symbol: 'MT' },
  { code: 'MM', name: 'Myanmar', currency: 'MMK', symbol: 'K' },
  { code: 'NA', name: 'Namibia', currency: 'NAD', symbol: '$' },
  { code: 'NR', name: 'Nauru', currency: 'AUD', symbol: '$' },
  { code: 'NP', name: 'Nepal', currency: 'NPR', symbol: '₨' },
  { code: 'NL', name: 'Netherlands', currency: 'EUR', symbol: '€' },
  { code: 'NZ', name: 'New Zealand', currency: 'NZD', symbol: '$' },
  { code: 'NI', name: 'Nicaragua', currency: 'NIO', symbol: 'C$' },
  { code: 'NE', name: 'Niger', currency: 'XOF', symbol: 'CFA' },
  { code: 'NG', name: 'Nigeria', currency: 'NGN', symbol: '₦' },
  { code: 'KP', name: 'North Korea', currency: 'KPW', symbol: '₩' },
  { code: 'MK', name: 'North Macedonia', currency: 'MKD', symbol: 'ден' },
  { code: 'NO', name: 'Norway', currency: 'NOK', symbol: 'kr' },
  { code: 'OM', name: 'Oman', currency: 'OMR', symbol: 'ر.ع.' },
  { code: 'PK', name: 'Pakistan', currency: 'PKR', symbol: '₨' },
  { code: 'PW', name: 'Palau', currency: 'USD', symbol: '$' },
  { code: 'PA', name: 'Panama', currency: 'PAB', symbol: 'B/.' },
  { code: 'PG', name: 'Papua New Guinea', currency: 'PGK', symbol: 'K' },
  { code: 'PY', name: 'Paraguay', currency: 'PYG', symbol: '₲' },
  { code: 'PE', name: 'Peru', currency: 'PEN', symbol: 'S/.' },
  { code: 'PH', name: 'Philippines', currency: 'PHP', symbol: '₱' },
  { code: 'PL', name: 'Poland', currency: 'PLN', symbol: 'zł' },
  { code: 'PT', name: 'Portugal', currency: 'EUR', symbol: '€' },
  { code: 'QA', name: 'Qatar', currency: 'QAR', symbol: 'ر.ق' },
  { code: 'RO', name: 'Romania', currency: 'RON', symbol: 'lei' },
  { code: 'RU', name: 'Russia', currency: 'RUB', symbol: '₽' },
  { code: 'RW', name: 'Rwanda', currency: 'RWF', symbol: 'FRw' },
  { code: 'KN', name: 'Saint Kitts and Nevis', currency: 'XCD', symbol: '$' },
  { code: 'LC', name: 'Saint Lucia', currency: 'XCD', symbol: '$' },
  { code: 'VC', name: 'Saint Vincent and the Grenadines', currency: 'XCD', symbol: '$' },
  { code: 'WS', name: 'Samoa', currency: 'WST', symbol: 'T' },
  { code: 'SM', name: 'San Marino', currency: 'EUR', symbol: '€' },
  { code: 'ST', name: 'Sao Tome and Principe', currency: 'STN', symbol: 'Db' },
  { code: 'SA', name: 'Saudi Arabia', currency: 'SAR', symbol: 'ر.س' },
  { code: 'SN', name: 'Senegal', currency: 'XOF', symbol: 'CFA' },
  { code: 'RS', name: 'Serbia', currency: 'RSD', symbol: 'дин.' },
  { code: 'SC', name: 'Seychelles', currency: 'SCR', symbol: '₨' },
  { code: 'SL', name: 'Sierra Leone', currency: 'SLL', symbol: 'Le' },
  { code: 'SG', name: 'Singapore', currency: 'SGD', symbol: '$' },
  { code: 'SK', name: 'Slovakia', currency: 'EUR', symbol: '€' },
  { code: 'SI', name: 'Slovenia', currency: 'EUR', symbol: '€' },
  { code: 'SB', name: 'Solomon Islands', currency: 'SBD', symbol: '$' },
  { code: 'SO', name: 'Somalia', currency: 'SOS', symbol: 'Sh' },
  { code: 'ZA', name: 'South Africa', currency: 'ZAR', symbol: 'R' },
  { code: 'KR', name: 'South Korea', currency: 'KRW', symbol: '₩' },
  { code: 'SS', name: 'South Sudan', currency: 'SSP', symbol: '£' },
  { code: 'ES', name: 'Spain', currency: 'EUR', symbol: '€' },
  { code: 'LK', name: 'Sri Lanka', currency: 'LKR', symbol: 'Rs' },
  { code: 'SD', name: 'Sudan', currency: 'SDG', symbol: 'ج.س.' },
  { code: 'SR', name: 'Suriname', currency: 'SRD', symbol: '$' },
  { code: 'SE', name: 'Sweden', currency: 'SEK', symbol: 'kr' },
  { code: 'CH', name: 'Switzerland', currency: 'CHF', symbol: 'CHF' },
  { code: 'SY', name: 'Syria', currency: 'SYP', symbol: '£S' },
  { code: 'TW', name: 'Taiwan', currency: 'TWD', symbol: 'NT$' },
  { code: 'TJ', name: 'Tajikistan', currency: 'TJS', symbol: 'SM' },
  { code: 'TZ', name: 'Tanzania', currency: 'TZS', symbol: 'TSh' },
  { code: 'TH', name: 'Thailand', currency: 'THB', symbol: '฿' },
  { code: 'TL', name: 'Timor-Leste', currency: 'USD', symbol: '$' },
  { code: 'TG', name: 'Togo', currency: 'XOF', symbol: 'CFA' },
  { code: 'TO', name: 'Tonga', currency: 'TOP', symbol: 'T$' },
  { code: 'TT', name: 'Trinidad and Tobago', currency: 'TTD', symbol: '$' },
  { code: 'TN', name: 'Tunisia', currency: 'TND', symbol: 'د.ت' },
  { code: 'TR', name: 'Turkey', currency: 'TRY', symbol: '₺' },
  { code: 'TM', name: 'Turkmenistan', currency: 'TMT', symbol: 'm' },
  { code: 'TV', name: 'Tuvalu', currency: 'AUD', symbol: '$' },
  { code: 'UG', name: 'Uganda', currency: 'UGX', symbol: 'USh' },
  { code: 'UA', name: 'Ukraine', currency: 'UAH', symbol: '₴' },
  { code: 'AE', name: 'United Arab Emirates', currency: 'AED', symbol: 'د.إ' },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP', symbol: '£' },
  { code: 'US', name: 'United States', currency: 'USD', symbol: '$' },
  { code: 'UY', name: 'Uruguay', currency: 'UYU', symbol: '$U' },
  { code: 'UZ', name: 'Uzbekistan', currency: 'UZS', symbol: 'soʻm' },
  { code: 'VU', name: 'Vanuatu', currency: 'VUV', symbol: 'Vt' },
  { code: 'VE', name: 'Venezuela', currency: 'VES', symbol: 'Bs.S.' },
  { code: 'VN', name: 'Vietnam', currency: 'VND', symbol: '₫' },
  { code: 'YE', name: 'Yemen', currency: 'YER', symbol: '﷼' },
  { code: 'ZM', name: 'Zambia', currency: 'ZMW', symbol: 'ZK' },
  { code: 'ZW', name: 'Zimbabwe', currency: 'ZWL', symbol: '$' },
];

export const getCountryByCode = (code: string): Country | undefined => {
    return COUNTRIES.find(c => c.code === code);
}
