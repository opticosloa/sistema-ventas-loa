import React from 'react';
import { SalesItemsList } from './components/SalesItemsList';
import { SupervisorAuthModal } from '../components/modals/SupervisorAuthModal';
import { usePaymentLogic } from './hooks/usePaymentLogic';
import { PaymentHeader } from './components/payments/PaymentHeader';
import { PaymentSummary } from './components/payments/PaymentSummary';
import { PaymentList } from './components/payments/PaymentList';
import { AddPaymentForm } from './components/payments/AddPaymentForm';
import { PaymentActionButtons } from './components/payments/PaymentActionButtons';
import { MercadoPagoModals } from './components/payments/MercadoPagoModals';
import { useNavigate } from 'react-router-dom';

export const FormularioDePago: React.FC = () => {
  const navigate = useNavigate();
  const {
    ventaId,
    currentTotal,
    totalPagado,
    restante,
    pagos,
    loading,
    saleItems,
    dniSearch,
    setDniSearch,
    handleSearchDni,
    handleCancelSale,
    supervisorModalOpen,
    setSupervisorModalOpen,
    handleSupervisorSuccess,
    selectedMethod,
    setSelectedMethod,
    amountInput,
    setAmountInput,
    handleAddPayment,
    handleRemovePayment,
    onSubmit,
    mpModalOpen,
    setMpModalOpen,
    mpAmount,
    pointDevices,
    selectedDeviceId,
    setSelectedDeviceId,
    startMpQrFlow,
    startMpPointFlow,

    asyncPaymentStatus,
    qrData,
    pointStatus,
    setAsyncPaymentStatus,
    obrasSociales,
    selectedObraSocialId,
    setSelectedObraSocialId,
    nroOrden,
    setNroOrden,
    handleCoverInsurance,
    isDirectSale,
    handlePayOnPickup,
    payOnPickupDisabled,
    coverageDetails
  } = usePaymentLogic();

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 text-blanco">
      <PaymentHeader
        dniSearch={dniSearch}
        setDniSearch={setDniSearch}
        handleSearchDni={handleSearchDni}
        ventaId={ventaId}
        handleCancelSale={handleCancelSale}
      />

      {ventaId && (
        <div className="bg-gray-800 p-4 rounded-lg mb-4 text-white">
          <div className="flex justify-between mb-2">
            <span className="font-bold">Venta #{ventaId}</span>
            <span className="text-xl font-bold text-celeste">${currentTotal.toLocaleString()}</span>
          </div>

          <SalesItemsList
            items={saleItems}
            onItemsChange={() => { }}
            readonly={true}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <PaymentSummary
            currentTotal={currentTotal}
            totalPagado={totalPagado}
            restante={restante}
          />

          <PaymentList
            pagos={pagos}
            handleRemovePayment={handleRemovePayment}
          />
        </div>

        <div className="lg:col-span-1">
          <div className="bg-gray-800 bg-opacity-50 p-6 rounded-xl border border-gray-700 h-full flex flex-col">
            <AddPaymentForm
              selectedMethod={selectedMethod}
              setSelectedMethod={setSelectedMethod}
              amountInput={amountInput}
              setAmountInput={setAmountInput}
              handleAddPayment={handleAddPayment}
              currentTotal={currentTotal}
              obrasSociales={obrasSociales}
              selectedObraSocialId={selectedObraSocialId}
              setSelectedObraSocialId={setSelectedObraSocialId}
              nroOrden={nroOrden}
              setNroOrden={setNroOrden}
              onCoverInsurance={handleCoverInsurance}
              hasSocialWorkPayment={pagos.some(p => p.metodo === 'OBRA_SOCIAL')}
              coverageDetails={coverageDetails}
            />

            <PaymentActionButtons
              loading={loading}
              currentTotal={currentTotal}
              onPay={onSubmit}
              onAuthorize={isDirectSale ? undefined : handlePayOnPickup}
              payOnPickupDisabled={payOnPickupDisabled}
            />
          </div>
        </div>
      </div>

      <SupervisorAuthModal
        isOpen={supervisorModalOpen}
        onClose={() => setSupervisorModalOpen(false)}
        onSuccess={handleSupervisorSuccess}
        actionName="Autorizar Retiro Sin Pago"
      />

      {currentTotal <= 0 && (
        <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded-lg mb-6 flex items-center gap-3">
          <span className="text-3xl">⚠️</span>
          <div>
            <h3 className="font-bold text-lg">Error en la Venta</h3>
            <p>El total de la venta es $0. No se puede procesar el pago ni autorizar retiro.</p>
            <button onClick={() => navigate('/ventas')} className="underline mt-1 hover:text-white">
              Volver y revisar items
            </button>
          </div>
        </div>
      )}

      <MercadoPagoModals
        mpModalOpen={mpModalOpen}
        setMpModalOpen={setMpModalOpen}
        mpAmount={mpAmount}
        pointDevices={pointDevices}
        selectedDeviceId={selectedDeviceId}
        setSelectedDeviceId={setSelectedDeviceId}
        startMpQrFlow={startMpQrFlow}
        startMpPointFlow={startMpPointFlow}

        asyncPaymentStatus={asyncPaymentStatus}
        qrData={qrData}
        pointStatus={pointStatus}
        setAsyncPaymentStatus={setAsyncPaymentStatus}
      />
    </div>
  );
};
