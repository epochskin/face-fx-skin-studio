import Image from "next/image";
import { InstagramIcon, MailIcon } from "./Icons";
import Link from "next/link";
import { DIRECTIONS_URL, NAV, SITE } from "@/lib/site";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="wrap footer-grid">
        <div>
          <Image src="/images/logo.png" alt={SITE.name} width={72} height={72} />
          <p className="footer-blurb">
            Corrective skincare, HydraFacials and sugaring in a calm studio inside {SITE.locatedInside}.
          </p>
        </div>

        <div>
          <h2 className="footer-h">Visit</h2>
          <p>
            {SITE.street}<br />
            {SITE.cityLine}<br />
            Inside {SITE.locatedInside}
          </p>
          <p><a href={DIRECTIONS_URL} target="_blank" rel="noopener noreferrer">Get directions</a></p>
        </div>

        <div>
          <h2 className="footer-h">Contact</h2>
          <p><a href={`tel:${SITE.phoneTel}`}>{SITE.phoneDisplay}</a></p>
          <p><a href={`sms:${SITE.phoneTel}`}>Text us</a></p>
          <p><a className="with-ico" href={`mailto:${SITE.email}`}><MailIcon size={18} />{SITE.email}</a></p>
          <p>
            <a className="with-ico" href={SITE.instagramUrl} target="_blank" rel="noopener noreferrer">
              <InstagramIcon size={18} />Instagram {SITE.instagramHandle}
            </a>
          </p>
        </div>

        <div>
          <h2 className="footer-h">Explore</h2>
          <p><Link href="/">Home</Link></p>
          {NAV.map((n) => (
            <p key={n.href}><Link href={n.href}>{n.label}</Link></p>
          ))}
          <p><Link href="/privacy">Privacy notice</Link></p>
        </div>
      </div>

      <div className="wrap footer-base">
        <p>© {new Date().getFullYear()} {SITE.name}. All rights reserved.</p>
        <p className="epoch-credit">
          <a href="https://epoch-skin.com" target="_blank" rel="noopener noreferrer">Designed by Epoch Skin</a>
        </p>
      </div>
    </footer>
  );
}
