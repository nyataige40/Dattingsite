// FontAwesome-backed icon module.
//
// Keeps the original component API (size, color, className, ...rest) so call
// sites read the same as before, but the glyphs now come from Font Awesome 6
// instead of hand-written SVG paths. Only the icon definitions below changed.
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEnvelope, faLock, faUser, faEye, faEyeSlash, faBagShopping,
  faCommentDots, faRightFromBracket, faCheck, faArrowUpFromBracket,
  faHeart, faStar, faPaperPlane, faArrowsRotate, faBell, faXmark,
  faWandMagicSparkles, faCrown, faShieldHalved, faBolt, faRocket,
  faTriangleExclamation, faFlag, faTicket, faUsers, faDollarSign,
  faArrowTrendUp, faClock, faCircleCheck, faCircleXmark, faChartColumn,
  faCalendar, faDownload, faDatabase, faMars, faVenus, faEllipsis,
  faSpinner, faChartLine, faGift, faWallet, faSliders, faArrowRight,
  faPlus, faFire, faLayerGroup, faComment
} from '@fortawesome/free-solid-svg-icons';
import { faGoogle, faFacebookF } from '@fortawesome/free-brands-svg-icons';

/**
 * Wraps a Font Awesome definition in the same prop surface the old inline SVGs
 * exposed. `size` maps to Font Awesome's `fontSize` so numeric call sites such
 * as <Bell size={18} /> keep working unchanged.
 */
const makeIcon = (definition) => {
  const Icon = ({ size = 20, color, className = '', ...rest }) => (
    <FontAwesomeIcon
      icon={definition}
      fontSize={size}
      color={color}
      className={className}
      {...rest}
    />
  );
  Icon.displayName = definition.iconName;
  return Icon;
};

export const Mail = makeIcon(faEnvelope);
export const Lock = makeIcon(faLock);
export const User = makeIcon(faUser);
export const Eye = makeIcon(faEye);
export const EyeOff = makeIcon(faEyeSlash);
export const ShoppingBag = makeIcon(faBagShopping);
export const MessageCircle = makeIcon(faCommentDots);
export const LogOut = makeIcon(faRightFromBracket);
export const Check = makeIcon(faCheck);
export const Upload = makeIcon(faArrowUpFromBracket);
export const Star = makeIcon(faStar);
export const Send = makeIcon(faPaperPlane);
export const RefreshCw = makeIcon(faArrowsRotate);
export const Bell = makeIcon(faBell);
export const X = makeIcon(faXmark);
export const Sparkles = makeIcon(faWandMagicSparkles);
export const Crown = makeIcon(faCrown);
export const Shield = makeIcon(faShieldHalved);
export const Zap = makeIcon(faBolt);
export const Rocket = makeIcon(faRocket);
export const AlertTriangle = makeIcon(faTriangleExclamation);
export const Flag = makeIcon(faFlag);
export const Ticket = makeIcon(faTicket);
export const Users = makeIcon(faUsers);
export const DollarSign = makeIcon(faDollarSign);
export const TrendingUp = makeIcon(faArrowTrendUp);
export const Clock = makeIcon(faClock);
export const CheckCircle = makeIcon(faCircleCheck);
export const XCircle = makeIcon(faCircleXmark);
export const BarChart = makeIcon(faChartColumn);
export const LineChart = makeIcon(faChartLine);
export const Calendar = makeIcon(faCalendar);
export const Download = makeIcon(faDownload);
export const Database = makeIcon(faDatabase);
export const Spinner = makeIcon(faSpinner);
export const Filter = makeIcon(faSliders);
export const ArrowRight = makeIcon(faArrowRight);
export const Plus = makeIcon(faPlus);
export const Flame = makeIcon(faFire);
export const Layers = makeIcon(faLayerGroup);
export const Comment = makeIcon(faComment);
export const Wallet = makeIcon(faWallet);
export const Gift = makeIcon(faGift);

// Gender selection used to be the 👨 / 👩 emoji.
export const Mars = makeIcon(faMars);
export const Venus = makeIcon(faVenus);

/**
 * Loading / truncation affordance, previously a literal "…" character.
 * `animated` spins it for in-flight states.
 */
export const Ellipsis = ({ size = 20, animated = false, color, className = '', ...rest }) => (
  <FontAwesomeIcon
    icon={faEllipsis}
    fontSize={size}
    color={color}
    className={`${className}${animated ? ' animate-spin' : ''}`.trim()}
    {...rest}
  />
);

/**
 * Both are "like" affordances, and Font Awesome's solid heart is the right
 * weight for each, so they share one glyph. They stay separate names because
 * call sites read better: sent/state vs. plain.
 */
export const Heart = makeIcon(faHeart);
export const HeartFilled = makeIcon(faHeart);

export const GoogleIcon = makeIcon(faGoogle);
export const FacebookIcon = makeIcon(faFacebookF);

/** Generic escape hatch for one-off glyphs not worth naming. */
export const Icon = ({ icon, size = 20, color, className = '', ...rest }) => (
  <FontAwesomeIcon icon={icon} fontSize={size} color={color} className={className} {...rest} />
);

export { FontAwesomeIcon };