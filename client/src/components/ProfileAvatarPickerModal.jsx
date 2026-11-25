import React, { useState } from 'react';
import { X, Search, Sparkles, Check, User } from 'lucide-react';

export const AVATAR_COLLECTION = [
  // --- Animals & Nature ---
  { id: 'anim_pig', name: 'Small Pig', icon: '🐷', category: 'nature', bg: 'from-pink-500/20 to-rose-600/30' },
  { id: 'anim_puppy', name: 'Small Puppy', icon: '🐶', category: 'nature', bg: 'from-amber-500/20 to-yellow-600/30' },
  { id: 'anim_cow', name: 'Gentle Cow', icon: '🐮', category: 'nature', bg: 'from-emerald-500/20 to-teal-600/30' },
  { id: 'anim_rabbit', name: 'Fluffy Rabbit', icon: '🐰', category: 'nature', bg: 'from-purple-500/20 to-pink-600/30' },
  { id: 'anim_parrot_emerald', name: 'Emerald Parrot', icon: '🦜', category: 'nature', bg: 'from-emerald-500/20 to-lime-600/30' },
  { id: 'anim_parrot_scarlet', name: 'Scarlet Macaw', icon: '🦚', category: 'nature', bg: 'from-rose-500/20 to-amber-600/30' },
  { id: 'anim_parrot_blue', name: 'Blue-Gold Macaw', icon: '🐦', category: 'nature', bg: 'from-cyan-500/20 to-blue-600/30' },
  { id: 'anim_butterfly', name: 'Monarch Butterfly', icon: '🦋', category: 'nature', bg: 'from-indigo-500/20 to-purple-600/30' },
  { id: 'anim_dino_rex', name: 'T-Rex Dinosaur', icon: '🦖', category: 'nature', bg: 'from-green-600/20 to-emerald-800/30' },
  { id: 'anim_dino_brachio', name: 'Brachiosaurus', icon: '🦕', category: 'nature', bg: 'from-teal-600/20 to-cyan-800/30' },
  { id: 'nature_waterfall', name: 'Misty Waterfall', icon: '🏞️', category: 'nature', bg: 'from-cyan-500/20 to-blue-600/30' },
  { id: 'nature_river', name: 'Flowing River', icon: '🌊', category: 'nature', bg: 'from-blue-600/20 to-indigo-700/30' },
  { id: 'nature_house', name: 'Cozy Cottage', icon: '🏡', category: 'nature', bg: 'from-amber-600/20 to-orange-700/30' },

  // --- Objects & Space ---
  { id: 'obj_astronaut', name: 'Cosmic Astronaut', icon: '🧑‍🚀', category: 'objects', bg: 'from-indigo-600/20 to-violet-800/30' },
  { id: 'obj_cake', name: 'Birthday Cake', icon: '🎂', category: 'objects', bg: 'from-pink-500/20 to-fuchsia-600/30' },
  { id: 'obj_football', name: 'Classic Football', icon: '⚽', category: 'objects', bg: 'from-neutral-500/20 to-slate-700/30' },
  { id: 'obj_skull', name: 'Human Skull', icon: '💀', category: 'objects', bg: 'from-zinc-500/20 to-neutral-700/30' },
  { id: 'obj_supercar', name: 'Sports Supercar', icon: '🏎️', category: 'objects', bg: 'from-red-500/20 to-rose-700/30' },
  { id: 'obj_classic_car', name: 'Classic Vintage Car', icon: '🚗', category: 'objects', bg: 'from-blue-500/20 to-indigo-700/30' },
  { id: 'obj_motorcycle', name: 'Superbike Racer', icon: '🏍️', category: 'objects', bg: 'from-amber-500/20 to-red-600/30' },
  { id: 'obj_airplane', name: 'Supersonic Jet', icon: '✈️', category: 'objects', bg: 'from-sky-500/20 to-cyan-600/30' },

  // --- Characters & Professions ---
  { id: 'prof_teacher_m', name: 'Professor (Male)', icon: '👨‍🏫', category: 'characters', bg: 'from-blue-500/20 to-cyan-600/30' },
  { id: 'prof_teacher_f', name: 'Professor (Female)', icon: '👩‍🏫', category: 'characters', bg: 'from-purple-500/20 to-pink-600/30' },
  { id: 'prof_builder_m', name: 'Builder (Male)', icon: '👷‍♂️', category: 'characters', bg: 'from-amber-500/20 to-yellow-600/30' },
  { id: 'prof_builder_f', name: 'Builder (Female)', icon: '👷‍♀️', category: 'characters', bg: 'from-orange-500/20 to-amber-600/30' },
  { id: 'prof_student_m', name: 'Student (Male)', icon: '👨‍🎓', category: 'characters', bg: 'from-emerald-500/20 to-teal-600/30' },
  { id: 'prof_student_f', name: 'Student (Female)', icon: '👩‍🎓', category: 'characters', bg: 'from-violet-500/20 to-purple-600/30' },
  { id: 'prof_farmer_m', name: 'Farmer (Male)', icon: '👨‍🌾', category: 'characters', bg: 'from-lime-500/20 to-green-600/30' },
  { id: 'prof_farmer_f', name: 'Farmer (Female)', icon: '👩‍🌾', category: 'characters', bg: 'from-emerald-500/20 to-green-600/30' },
  { id: 'prof_coder_m', name: 'Developer (Male)', icon: '👨‍💻', category: 'characters', bg: 'from-cyan-500/20 to-blue-600/30' },
  { id: 'prof_coder_f', name: 'Developer (Female)', icon: '👩‍💻', category: 'characters', bg: 'from-fuchsia-500/20 to-purple-600/30' },
  { id: 'prof_investor', name: 'Wall St Investor', icon: '🤑', category: 'characters', bg: 'from-emerald-400/25 to-teal-600/35' },
  { id: 'prof_business_m', name: 'Executive (Male)', icon: '👨‍💼', category: 'characters', bg: 'from-slate-500/20 to-zinc-700/30' },
  { id: 'prof_business_f', name: 'Executive (Female)', icon: '👩‍💼', category: 'characters', bg: 'from-indigo-500/20 to-slate-700/30' },
  { id: 'prof_doctor_m', name: 'Physician (Male)', icon: '👨‍⚕️', category: 'characters', bg: 'from-teal-500/20 to-cyan-600/30' },
  { id: 'prof_doctor_f', name: 'Physician (Female)', icon: '👩‍⚕️', category: 'characters', bg: 'from-rose-500/20 to-teal-600/30' },
  { id: 'prof_cowboy', name: 'Wild West Cowboy', icon: '🤠', category: 'characters', bg: 'from-amber-600/25 to-yellow-800/35' },
  { id: 'char_detective', name: 'Mystery Detective', icon: '🕵️‍♂️', category: 'characters', bg: 'from-neutral-600/25 to-slate-800/35' },
  { id: 'char_artist', name: 'Fine Artist', icon: '🎨', category: 'characters', bg: 'from-pink-500/20 to-amber-500/30' },
  { id: 'char_chef', name: 'Master Chef', icon: '🧑‍🍳', category: 'characters', bg: 'from-orange-500/20 to-red-600/30' },
  { id: 'char_ninja', name: 'Shadow Ninja', icon: '🥷', category: 'characters', bg: 'from-zinc-700/30 to-black/40' },
  { id: 'char_wizard', name: 'Mystic Wizard', icon: '🧙‍♂️', category: 'characters', bg: 'from-purple-600/25 to-indigo-800/35' },

  // --- Global Currency & Banknotes ---
  { id: 'note_usd', name: 'US Dollar ($100)', icon: '💵', category: 'currency', bg: 'from-emerald-500/25 to-green-700/35' },
  { id: 'note_eur', name: 'Euro (€500)', icon: '💶', category: 'currency', bg: 'from-blue-500/25 to-indigo-700/35' },
  { id: 'note_gbp', name: 'British Pound (£50)', icon: '💷', category: 'currency', bg: 'from-purple-500/25 to-rose-700/35' },
  { id: 'note_jpy', name: 'Japanese Yen (¥10k)', icon: '💴', category: 'currency', bg: 'from-amber-500/25 to-orange-700/35' },
  { id: 'note_inr', name: 'Indian Rupee (₹ Note)', icon: '💸', category: 'currency', bg: 'from-teal-500/25 to-emerald-700/35' },
  { id: 'note_gold', name: 'Gold Bullion Bar', icon: '🪙', category: 'currency', bg: 'from-yellow-400/30 to-amber-600/40' },
  { id: 'note_vault', name: 'Vault Money Sack', icon: '💰', category: 'currency', bg: 'from-amber-500/25 to-yellow-700/35' },
  { id: 'note_bank', name: 'Central Bank Vault', icon: '🏦', category: 'currency', bg: 'from-slate-500/25 to-blue-800/35' }
];

export function getAvatarById(id) {
  if (!id) return null;
  return AVATAR_COLLECTION.find(a => a.id === id) || null;
}

export function renderUserAvatar(avatarId, fallbackHandle = '?', sizeClass = 'w-10 h-10 text-xl') {
  const avatar = getAvatarById(avatarId);
  if (avatar) {
    return (
      <div className={`${sizeClass} rounded-full flex items-center justify-center bg-gradient-to-br ${avatar.bg} shadow-md border border-white/20 select-none flex-shrink-0`}>
        <span>{avatar.icon}</span>
      </div>
    );
  }
  const initial = (fallbackHandle && typeof fallbackHandle === 'string') ? fallbackHandle.charAt(0).toUpperCase() : '?';
  return (
    <div className={`${sizeClass} rounded-full flex items-center justify-center bg-gradient-to-tr from-cyan-600 to-blue-500 text-white font-bold shadow-md border border-white/20 select-none flex-shrink-0`}>
      <span>{initial}</span>
    </div>
  );
}

export default function ProfileAvatarPickerModal({
  isOpen,
  onClose,
  currentAvatarId,
  currentUser,
  socket,
  onAvatarUpdated
}) {
  const [selectedAvatarId, setSelectedAvatarId] = useState(currentAvatarId || null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const categories = [
    { id: 'all', label: 'All Avatars' },
    { id: 'nature', label: '🐾 Animals & Nature' },
    { id: 'objects', label: '🚀 Objects & Space' },
    { id: 'characters', label: '🎭 Characters & Jobs' },
    { id: 'currency', label: '💵 Global Banknotes' }
  ];

  const filtered = AVATAR_COLLECTION.filter(item => {
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.icon.includes(searchQuery);
    return matchesCategory && matchesSearch;
  });

  const selectedItem = AVATAR_COLLECTION.find(a => a.id === selectedAvatarId);

  const handleSave = () => {
    if (!socket) return;
    setSaving(true);
    socket.emit('user:update-avatar', { avatarId: selectedAvatarId }, (res) => {
      setSaving(false);
      if (res && res.success) {
        if (onAvatarUpdated) onAvatarUpdated(selectedAvatarId);
        onClose();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div
        className="w-full max-w-2xl bg-neutral-900/95 border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        style={{
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(6, 182, 212, 0.15)'
        }}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 text-cyan-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">Customize Profile Avatar</h2>
              <p className="text-xs text-neutral-400">Choose an illustrated avatar, character, or global banknote</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Preview Bar */}
        <div className="px-5 py-3 bg-gradient-to-r from-cyan-950/40 via-neutral-900 to-blue-950/40 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              {renderUserAvatar(selectedAvatarId, currentUser?.handle, 'w-12 h-12 text-2xl')}
              {currentUser?.tier && (
                <div
                  className="absolute -bottom-1 -left-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] shadow-md border border-black/40"
                  style={{
                    background: currentUser.tier === 'Gold'
                      ? 'linear-gradient(135deg, #FFE066, #D4AF37, #996515)'
                      : currentUser.tier === 'Silver'
                      ? 'linear-gradient(135deg, #F0F4F8, #A0AEC0, #718096)'
                      : 'linear-gradient(135deg, #E0A96D, #CD7F32, #8C4A14)'
                  }}
                  title={`${currentUser.tier} Tier`}
                >
                  {currentUser.tier === 'Gold' ? '🏆' : currentUser.tier === 'Silver' ? '🥈' : '🥉'}
                </div>
              )}
            </div>
            <div>
              <div className="text-sm font-semibold text-white flex items-center gap-2">
                <span>@{currentUser?.handle || 'You'}</span>
                {selectedItem && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    {selectedItem.name}
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-400">
                {selectedItem ? 'Click Save to apply across all chat rooms' : 'Select an avatar from the gallery below'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setSelectedAvatarId(null)}
            className="text-xs text-neutral-400 hover:text-cyan-300 underline underline-offset-4 transition-colors"
          >
            Reset to Initial
          </button>
        </div>

        {/* Search & Category Filter Tabs */}
        <div className="p-4 border-b border-white/10 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search avatars (e.g. puppy, astronaut, teacher, dollar, euro)..."
              className="w-full pl-9 pr-4 py-2 bg-neutral-800/80 border border-white/10 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500/60"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  activeCategory === cat.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Avatars Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {filtered.map(item => {
              const isSelected = selectedAvatarId === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedAvatarId(item.id)}
                  className={`group relative flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 ${
                    isSelected
                      ? 'bg-cyan-500/20 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.35)] scale-105'
                      : 'bg-neutral-800/60 border-white/10 hover:border-white/30 hover:bg-neutral-800 hover:scale-102'
                  }`}
                >
                  {/* Avatar Icon Bubble */}
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl bg-gradient-to-br ${item.bg} border border-white/20 mb-2 shadow-md group-hover:scale-110 transition-transform`}>
                    <span>{item.icon}</span>
                  </div>

                  <span className="text-[11px] font-medium text-neutral-300 group-hover:text-white text-center truncate w-full">
                    {item.name}
                  </span>

                  {isSelected && (
                    <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-cyan-400 text-neutral-950 flex items-center justify-center shadow-md">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="py-12 text-center text-neutral-500 text-xs">
              No avatars matched your search query "{searchQuery}".
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-neutral-900 flex items-center justify-between">
          <div className="text-xs text-neutral-400">
            {selectedAvatarId ? (
              <span className="text-cyan-300 font-medium">Selected: {selectedItem?.name}</span>
            ) : (
              <span>Using default letter avatar</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 rounded-xl text-xs font-bold text-neutral-950 bg-gradient-to-r from-cyan-400 to-blue-400 hover:brightness-110 shadow-lg shadow-cyan-500/25 transition-all disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Avatar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
