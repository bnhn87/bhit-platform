import React from 'react';

type Variant = 'ok'|'warn'|'bad'|'info';

type Props = {
  variant?: Variant;
  label: string;
  subLabel?: string;
  link?: boolean;
  pulse?: boolean;
  onClick?: () => void;
}

export default function StatusPill({ variant='info', label, subLabel, link=false, pulse=false, onClick }:Props){
  const cls = ['bhit-pill', variant, link?'is-link':'', pulse?'pulse':''].filter(Boolean).join(' ');
  return (
    <span className={cls} onClick={onClick} role={link? 'button': undefined}>
      <span className="dot"/>
      <span className="lbl">{label}</span>
      {subLabel && <span className="sub">· {subLabel}</span>}
    </span>
  );
}
