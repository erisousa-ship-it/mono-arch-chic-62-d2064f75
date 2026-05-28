import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../ClonedAuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Check, User, Briefcase, GraduationCap, Shield, Phone, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { getOrCreateSvcProfile, normalizeAuthUser } from '../lib/authProfile';

export default function VolunteerRegisterPage() {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Professional Areas with translations
  const PROFESSIONAL_AREAS = [
    { value: 'legal', label: t('volunteerAreaLegal'), icon: '⚖️', desc: t('volunteerAreaLegalDesc') },
    { value: 'health', label: t('volunteerAreaHealth'), icon: '🏥', desc: t('volunteerAreaHealthDesc') },
    { value: 'education', label: t('volunteerAreaEducation'), icon: '📚', desc: t('volunteerAreaEducationDesc') },
    { value: 'translation', label: t('volunteerAreaTranslation'), icon: '🌍', desc: t('volunteerAreaTranslationDesc') },
    { value: 'family', label: t('volunteerAreaFamily'), icon: '👨‍👩‍👧', desc: t('volunteerAreaFamilyDesc') },
    { value: 'employment', label: t('volunteerAreaEmployment'), icon: '💼', desc: t('volunteerAreaEmploymentDesc') },
    { value: 'housing', label: t('volunteerAreaHousing'), icon: '🏠', desc: t('volunteerAreaHousingDesc') },
    { value: 'administration', label: t('volunteerAreaAdmin'), icon: '📋', desc: t('volunteerAreaAdminDesc') },
    { value: 'finance', label: t('volunteerAreaFinance'), icon: '💰', desc: t('volunteerAreaFinanceDesc') },
    { value: 'technology', label: t('volunteerAreaTech'), icon: '💻', desc: t('volunteerAreaTechDesc') }
  ];

  const HELP_TYPES = [
    t('helpTypePunctual'),
    t('helpTypeContinuous'),
    t('helpTypeWorkshops'),
    t('helpTypeDocReview'),
    t('helpTypeRemote'),
    t('helpTypeInPerson'),
    t('helpTypeTranslation'),
    t('helpTypeEmotional')
  ];

  const HELP_CATEGORIES = [
    { value: 'food', label: t('food'), icon: '🍽️', desc: t('helpCatFoodDesc') },
    { value: 'legal', label: t('legal'), icon: '⚖️', desc: t('helpCatLegalDesc') },
    { value: 'health', label: t('health'), icon: '🏥', desc: t('helpCatHealthDesc') },
    { value: 'housing', label: t('housing'), icon: '🏠', desc: t('helpCatHousingDesc') },
    { value: 'work', label: t('work'), icon: '💼', desc: t('helpCatWorkDesc') },
    { value: 'education', label: t('education'), icon: '📚', desc: t('helpCatEducationDesc') },
    { value: 'social', label: t('social'), icon: '🤝', desc: t('helpCatSocialDesc') },
    { value: 'clothes', label: t('helpCatClothes'), icon: '👕', desc: t('helpCatClothesDesc') },
    { value: 'furniture', label: t('helpCatFurniture'), icon: '🪑', desc: t('helpCatFurnitureDesc') },
    { value: 'transport', label: t('transport'), icon: '🚗', desc: t('helpCatTransportDesc') }
  ];

  // Etapa 1: Informações Pessoais
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [languages, setLanguages] = useState(['pt', 'fr']);

  // Etapa 2: Área Profissional
  const [professionalArea, setProfessionalArea] = useState('');
  const [specialties, setSpecialties] = useState('');
  const [organization, setOrganization] = useState('');
  const [professionalId, setProfessionalId] = useState('');

  // Etapa 3: Formação e Experiência
  const [education, setEducation] = useState('');
  const [certifications, setCertifications] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');
  const [experience, setExperience] = useState('');

  // Etapa 4: Disponibilidade e Contato
  const [availability, setAvailability] = useState('');
  const [helpTypes, setHelpTypes] = useState([]);
  const [helpCategories, setHelpCategories] = useState([]);
  const [linkedin, setLinkedin] = useState('');

  const nextStep = () => {
    if (step === 1) {
      if (!name || !email || !password) {
        toast.error(t('fillRequiredFields'));
        return;
      }
    }
    if (step === 2) {
      if (!professionalArea) {
        toast.error(t('selectProfessionalArea'));
        return;
      }
    }
    setStep(step + 1);
  };

  const prevStep = () => setStep(step - 1);

  const toggleHelpType = (type) => {
    setHelpTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const toggleHelpCategory = (category) => {
    setHelpCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleSubmit = async () => {
    if (!availability) {
      toast.error(t('informAvailability'));
      return;
    }

    if (helpCategories.length === 0) {
      toast.error(t('selectAtLeastOneCategory'));
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/volunteers`,
          data: { display_name: name, role: 'helper' },
        },
      });
      if (error) throw error;

      if (data.session) {
        const profile = await getOrCreateSvcProfile(data.user, {
          display_name: name,
          role: 'helper',
          categories: helpCategories,
        });
        await login(data.session.access_token, normalizeAuthUser(data.user, profile));
        toast.success(t('registerSuccess'));
        navigate('/volunteers', { replace: true });
      } else {
        toast.success('Verifique seu email para confirmar a conta');
        navigate('/auth', { replace: true });
      }
    } catch (error) {
      toast.error(error.message || t('registerError'));
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { number: 1, label: t('stepPersonal'), icon: User },
    { number: 2, label: t('stepProfessional'), icon: Briefcase },
    { number: 3, label: t('stepFormation'), icon: GraduationCap },
    { number: 4, label: t('stepAvailability'), icon: Shield }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50 py-4 sm:py-8 px-2 sm:px-4">
      <div className="container mx-auto max-w-4xl">
        <button
          onClick={() => navigate('/auth')}
          className="flex items-center gap-2 text-primary hover:text-primary-hover mb-4 sm:mb-6 font-medium ml-2"
        >
          <ArrowLeft size={20} />
          {t('back')}
        </button>

        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl p-4 sm:p-8 md:p-12">
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold text-textPrimary mb-2">
              🤝 {t('volunteerRegistration')}
            </h1>
            <p className="text-sm sm:text-base text-textSecondary px-2">
              {t('helpMigrantsWithExpertise')}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mb-6 sm:mb-10">
            <div className="flex justify-between items-center mb-4">
              {steps.map((s, idx) => {
                const Icon = s.icon;
                const isActive = step === s.number;
                const isCompleted = step > s.number;
                
                return (
                  <React.Fragment key={s.number}>
                    <div className="flex flex-col items-center min-w-0">
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center mb-1 sm:mb-2 transition-all ${
                        isCompleted 
                          ? 'bg-green-500 text-white' 
                          : isActive 
                            ? 'bg-primary text-white scale-110' 
                            : 'bg-gray-200 text-gray-500'
                      }`}>
                        {isCompleted ? <Check size={20} className="sm:w-6 sm:h-6" /> : <Icon size={20} className="sm:w-6 sm:h-6" />}
                      </div>
                      <span className={`text-[10px] sm:text-xs font-medium text-center ${isActive ? 'text-primary' : 'text-gray-500'}`}>
                        {s.label}
                      </span>
                    </div>
                    {idx < steps.length - 1 && (
                      <div className={`flex-1 h-1 mx-1 sm:mx-2 rounded ${step > s.number ? 'bg-green-500' : 'bg-gray-200'}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Step 1: Informações Pessoais */}
          {step === 1 && (
            <div className="space-y-4 sm:space-y-6 animate-fade-in">
              <h2 className="text-xl sm:text-2xl font-heading font-bold text-textPrimary mb-4 sm:mb-6 flex items-center gap-2">
                <User size={24} className="text-primary sm:w-7 sm:h-7" />
                {t('personalInfo')}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <Label className="text-sm sm:text-base font-bold mb-2 flex items-center gap-2">
                    <span className="text-red-500">*</span>
                    {t('fullName')}
                  </Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('yourFullName')}
                    className="rounded-xl h-11 sm:h-12 text-sm sm:text-base"
                  />
                </div>

                <div>
                  <Label className="text-sm sm:text-base font-bold mb-2 flex items-center gap-2">
                    <span className="text-red-500">*</span>
                    {t('email')}
                  </Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('yourEmail')}
                    className="rounded-xl h-11 sm:h-12 text-sm sm:text-base"
                  />
                </div>

                <div>
                  <Label className="text-sm sm:text-base font-bold mb-2 flex items-center gap-2">
                    <span className="text-red-500">*</span>
                    {t('password')}
                  </Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('minCharacters')}
                    className="rounded-xl h-11 sm:h-12 text-sm sm:text-base"
                  />
                </div>

                <div>
                  <Label className="text-sm sm:text-base font-bold mb-2">
                    {t('phoneOptional')}
                  </Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+33 6 12 34 56 78"
                    className="rounded-xl h-11 sm:h-12 text-sm sm:text-base"
                  />
                </div>
              </div>

              <div>
                <Label className="text-base font-bold mb-2">{t('languagesSpoken')}</Label>
                <div className="flex gap-2 flex-wrap">
                  {['pt', 'fr', 'en', 'es', 'ar', 'ru'].map(lang => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => {
                        setLanguages(prev => 
                          prev.includes(lang) 
                            ? prev.filter(l => l !== lang)
                            : [...prev, lang]
                        );
                      }}
                      className={`px-4 py-2 rounded-xl font-medium transition-all ${
                        languages.includes(lang)
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {lang.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Área Profissional */}
          {step === 2 && (
            <div className="space-y-4 sm:space-y-6 animate-fade-in">
              <h2 className="text-xl sm:text-2xl font-heading font-bold text-textPrimary mb-4 sm:mb-6 flex items-center gap-2">
                <Briefcase size={24} className="text-primary sm:w-7 sm:h-7" />
                {t('professionalArea')}
              </h2>

              <div>
                <Label className="text-sm sm:text-base font-bold mb-3 flex items-center gap-2">
                  <span className="text-red-500">*</span>
                  {t('selectYourArea')}
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {PROFESSIONAL_AREAS.map(area => (
                    <button
                      key={area.value}
                      type="button"
                      onClick={() => setProfessionalArea(area.value)}
                      className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 transition-all text-left ${
                        professionalArea === area.value
                          ? 'bg-primary text-white border-primary shadow-lg'
                          : 'bg-white border-gray-200 hover:border-primary hover:shadow-md'
                      }`}
                    >
                      <div className="text-2xl sm:text-3xl mb-1 sm:mb-2">{area.icon}</div>
                      <div className={`text-sm sm:text-base font-bold mb-1 ${professionalArea === area.value ? 'text-white' : 'text-textPrimary'}`}>
                        {area.label}
                      </div>
                      <div className={`text-xs sm:text-sm ${professionalArea === area.value ? 'text-white/90' : 'text-textSecondary'}`}>
                        {area.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <Label className="text-sm sm:text-base font-bold mb-2">
                    {t('specialtiesComma')}
                  </Label>
                  <Input
                    value={specialties}
                    onChange={(e) => setSpecialties(e.target.value)}
                    placeholder={t('specialtiesExample')}
                    className="rounded-xl h-11 sm:h-12 text-sm sm:text-base"
                  />
                </div>

                <div>
                  <Label className="text-sm sm:text-base font-bold mb-2">
                    {t('organization')}
                  </Label>
                  <Input
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    placeholder={t('organizationName')}
                    className="rounded-xl h-11 sm:h-12 text-sm sm:text-base"
                  />
                </div>

                <div>
                  <Label className="text-sm sm:text-base font-bold mb-2">
                    {t('professionalRegistration')}
                  </Label>
                  <Input
                    value={professionalId}
                    onChange={(e) => setProfessionalId(e.target.value)}
                    placeholder={t('registrationExample')}
                    className="rounded-xl h-11 sm:h-12 text-sm sm:text-base"
                  />
                  <p className="text-xs text-textMuted mt-1">{t('optionalCredibility')}</p>
                </div>

                <div>
                  <Label className="text-sm sm:text-base font-bold mb-2">
                    {t('yearsOfExperience')}
                  </Label>
                  <select
                    value={yearsExperience}
                    onChange={(e) => setYearsExperience(e.target.value)}
                    className="w-full h-11 sm:h-12 px-3 border rounded-xl bg-white text-sm sm:text-base"
                  >
                    <option value="">{t('select')}</option>
                    <option value="0-2">{t('years02')}</option>
                    <option value="3-5">{t('years35')}</option>
                    <option value="6-10">{t('years610')}</option>
                    <option value="11-15">{t('years1115')}</option>
                    <option value="16+">{t('years16plus')}</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Formação e Experiência */}
          {step === 3 && (
            <div className="space-y-4 sm:space-y-6 animate-fade-in">
              <h2 className="text-xl sm:text-2xl font-heading font-bold text-textPrimary mb-4 sm:mb-6 flex items-center gap-2">
                <GraduationCap size={24} className="text-primary sm:w-7 sm:h-7" />
                {t('formationAndExperience')}
              </h2>

              <div>
                <Label className="text-base font-bold mb-2">
                  {t('academicFormation')}
                </Label>
                <Textarea
                  value={education}
                  onChange={(e) => setEducation(e.target.value)}
                  placeholder={t('academicFormationExample')}
                  rows={3}
                  className="rounded-xl"
                />
              </div>

              <div>
                <Label className="text-base font-bold mb-2">
                  {t('certificationsAndCourses')}
                </Label>
                <Input
                  value={certifications}
                  onChange={(e) => setCertifications(e.target.value)}
                  placeholder={t('certificationsExample')}
                  className="rounded-xl h-12"
                />
              </div>

              <div>
                <Label className="text-base font-bold mb-2">
                  {t('relevantExperience')}
                </Label>
                <Textarea
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  placeholder={t('experienceDescription')}
                  rows={5}
                  className="rounded-xl"
                />
              </div>

              <div>
                <Label className="text-base font-bold mb-2">
                  {t('linkedinOptional')}
                </Label>
                <Input
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                  placeholder="https://linkedin.com/in/seu-perfil"
                  className="rounded-xl h-12"
                />
              </div>
            </div>
          )}

          {/* Step 4: Disponibilidade */}
          {step === 4 && (
            <div className="space-y-4 sm:space-y-6 animate-fade-in">
              <h2 className="text-xl sm:text-2xl font-heading font-bold text-textPrimary mb-4 sm:mb-6 flex items-center gap-2">
                <Shield size={24} className="text-primary sm:w-7 sm:h-7" />
                {t('availabilityAndHelpTypes')}
              </h2>

              <div>
                <Label className="text-base font-bold mb-2 flex items-center gap-2">
                  <span className="text-red-500">*</span>
                  {t('whenAvailable')}
                </Label>
                <Textarea
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value)}
                  placeholder={t('availabilityExample')}
                  rows={3}
                  className="rounded-xl"
                />
              </div>

              {/* NOVA SEÇÃO: Categorias de Ajuda */}
              <div className="bg-gradient-to-br from-blue-50 to-orange-50 p-5 rounded-2xl border-2 border-blue-200">
                <Label className="text-base font-bold mb-3 flex items-center gap-2">
                  <span className="text-red-500">*</span>
                  <span className="text-2xl">🎯</span>
                  {t('whichAreasHelp')}
                </Label>
                <p className="text-sm text-textSecondary mb-4">
                  {t('onlySeeRequestsSelected')}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {HELP_CATEGORIES.map(cat => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => toggleHelpCategory(cat.value)}
                      className={`p-3 sm:p-4 rounded-xl border-2 transition-all text-left ${
                        helpCategories.includes(cat.value)
                          ? 'bg-primary text-white border-primary shadow-lg'
                          : 'bg-white border-gray-200 hover:border-primary hover:shadow-md'
                      }`}
                    >
                      <div className="text-2xl mb-1">{cat.icon}</div>
                      <div className={`text-sm font-bold ${helpCategories.includes(cat.value) ? 'text-white' : 'text-textPrimary'}`}>
                        {cat.label}
                      </div>
                      <div className={`text-xs ${helpCategories.includes(cat.value) ? 'text-white/80' : 'text-textSecondary'}`}>
                        {cat.desc}
                      </div>
                    </button>
                  ))}
                </div>
                {helpCategories.length > 0 && (
                  <div className="mt-4 p-3 bg-green-100 rounded-xl border border-green-300">
                    <p className="text-sm text-green-800 font-medium">
                      ✓ {helpCategories.length} {t('categoriesSelected', { count: helpCategories.length })}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <Label className="text-base font-bold mb-3">
                  {t('typesOfHelpOffer')}
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {HELP_TYPES.map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => toggleHelpType(type)}
                      className={`p-4 rounded-xl border-2 transition-all text-left font-medium ${
                        helpTypes.includes(type)
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white border-gray-200 hover:border-primary'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          helpTypes.includes(type) ? 'border-white bg-white' : 'border-gray-300'
                        }`}>
                          {helpTypes.includes(type) && <Check size={16} className="text-primary" />}
                        </div>
                        {type}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-blue-50 p-6 rounded-2xl border-2 border-blue-200">
                <h3 className="font-bold text-primary mb-2 flex items-center gap-2">
                  <Shield size={20} />
                  {t('volunteerCommitment')}
                </h3>
                <ul className="text-sm text-textSecondary space-y-2">
                  <li>✓ {t('commitmentFree')}</li>
                  <li>✓ {t('commitmentConfidential')}</li>
                  <li>✓ {t('commitmentRespect')}</li>
                  <li>✓ {t('commitmentRespond')}</li>
                </ul>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-6 sm:mt-10 pt-4 sm:pt-6 border-t gap-2 sm:gap-4">
            {step > 1 && (
              <Button
                onClick={prevStep}
                variant="outline"
                className="rounded-full px-4 sm:px-8 py-3 sm:py-6 text-sm sm:text-base"
              >
                <ArrowLeft size={18} className="mr-1 sm:mr-2" />
                <span className="hidden sm:inline">{t('previous')}</span>
                <span className="sm:hidden">{t('back')}</span>
              </Button>
            )}
            {step < 4 ? (
              <Button
                onClick={nextStep}
                className="ml-auto rounded-full px-4 sm:px-8 py-3 sm:py-6 bg-primary hover:bg-primary-hover text-sm sm:text-base"
              >
                <span className="hidden sm:inline">{t('next')}</span>
                <span className="sm:hidden">{t('advance')}</span>
                <ArrowRight size={18} className="ml-1 sm:ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="ml-auto rounded-full px-4 sm:px-8 py-3 sm:py-6 bg-green-600 hover:bg-green-700 text-white font-bold text-sm sm:text-base"
              >
                {loading ? t('registering') : (
                  <>
                    <Check size={18} className="mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">{t('finishRegistration')}</span>
                    <span className="sm:hidden">{t('finish')}</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
