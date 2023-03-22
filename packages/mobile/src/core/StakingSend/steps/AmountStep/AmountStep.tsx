import {
  useFiatRate,
  useFiatValue,
  useReanimatedKeyboardHeight,
  useTranslator,
} from '$hooks';
import { Button, Separator, Spacer, Text } from '$uikit';
import React, { FC, memo, useEffect, useMemo, useRef } from 'react';
import * as S from './AmountStep.style';
import { parseLocaleNumber } from '$utils';
import { useSelector } from 'react-redux';
import BigNumber from 'bignumber.js';
import { TextInput } from 'react-native-gesture-handler';
import { walletWalletSelector } from '$store/wallet';
import {
  AmountInput,
  BottomButtonWrap,
  BottomButtonWrapHelper,
  NextCycle,
  StepScrollView,
} from '$shared/components';
import { StepComponentProps } from '$shared/components/StepView/StepView.interface';
import { SendAmount } from '$core/Send/Send.interface';
import { CryptoCurrencies } from '$shared/constants';
import { useCurrencyToSend } from '$hooks/useCurrencyToSend';
import { SharedValue, useAnimatedScrollHandler } from 'react-native-reanimated';
import { StakingSendSteps } from '$core/StakingSend/types';
import { PoolInfo } from '@tonkeeper/core';
import { Ton } from '$libs/Ton';
import { stakingFormatter } from '$utils/formatter';

interface Props extends StepComponentProps {
  pool: PoolInfo;
  isWithdrawal: boolean;
  stakingBalance: string;
  isPreparing: boolean;
  amount: SendAmount;
  stepsScrollTop: SharedValue<Record<StakingSendSteps, number>>;
  afterTopUpReward: ReturnType<typeof useFiatValue>;
  currentReward: ReturnType<typeof useFiatValue>;
  setAmount: React.Dispatch<React.SetStateAction<SendAmount>>;
  onContinue: () => void;
}

const AmountStepComponent: FC<Props> = (props) => {
  const {
    pool,
    isWithdrawal,
    stakingBalance,
    isPreparing,
    active,
    amount,
    stepsScrollTop,
    afterTopUpReward,
    currentReward,
    setAmount,
    onContinue,
  } = props;

  const fiatRate = useFiatRate(CryptoCurrencies.Ton);

  const {
    decimals,
    balance: walletBalance,
    currencyTitle,
  } = useCurrencyToSend(CryptoCurrencies.Ton);

  const minAmount = isWithdrawal ? '0' : Ton.fromNano(pool.minStake);

  const balance = isWithdrawal ? stakingBalance : walletBalance;

  const wallet = useSelector(walletWalletSelector);

  const isLockup = !!wallet?.ton.isLockup();

  const { isReadyToContinue } = useMemo(() => {
    const bigNum = new BigNumber(parseLocaleNumber(amount.value));
    return {
      isReadyToContinue:
        bigNum.isGreaterThan(0) &&
        (isLockup || bigNum.isLessThanOrEqualTo(balance)) &&
        bigNum.isGreaterThanOrEqualTo(new BigNumber(minAmount)),
    };
  }, [amount.value, balance, isLockup, minAmount]);

  const { keyboardHeightStyle } = useReanimatedKeyboardHeight();

  const scrollHandler = useAnimatedScrollHandler((event) => {
    stepsScrollTop.value = {
      ...stepsScrollTop.value,
      [StakingSendSteps.AMOUNT]: event.contentOffset.y,
    };
  });

  const t = useTranslator();

  const textInputRef = useRef<TextInput>(null);

  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;

      if (active) {
        const timeoutId = setTimeout(() => {
          textInputRef.current?.focus();
        }, 400);

        return () => clearTimeout(timeoutId);
      }
    }

    if (active) {
      textInputRef.current?.focus();
      return;
    }

    const timeoutId = setTimeout(() => {
      textInputRef.current?.blur();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [active]);

  return (
    <S.Container style={keyboardHeightStyle}>
      <StepScrollView onScroll={scrollHandler} active={active}>
        <S.Content>
          <S.InputContainer>
            <AmountInput
              innerRef={textInputRef}
              hideSwap={true}
              {...{
                decimals,
                balance,
                currencyTitle,
                amount,
                minAmount,
                fiatRate: fiatRate.today,
                setAmount,
              }}
            />
          </S.InputContainer>
          <Spacer y={16} />
          {isWithdrawal ? (
            <NextCycle cycleStart={pool.cycleStart} cycleEnd={pool.cycleEnd} />
          ) : (
            <>
              <S.TitleContainer>
                <Text variant="label1">{t('staking.rewards.title')}</Text>
              </S.TitleContainer>
              <S.Table>
                <S.Item>
                  <S.ItemLabel numberOfLines={1}>
                    {t('staking.rewards.after_top_up')}
                  </S.ItemLabel>
                  <S.ItemContent>
                    <S.ItemValue>
                      {t('staking.rewards.value', {
                        value: stakingFormatter.format(afterTopUpReward.amount),
                      })}
                    </S.ItemValue>
                    <S.ItemSubValue>{afterTopUpReward.fiatInfo.amount}</S.ItemSubValue>
                  </S.ItemContent>
                </S.Item>
                <Separator />
                <S.Item>
                  <S.ItemLabel numberOfLines={1}>
                    {t('staking.rewards.current')}
                  </S.ItemLabel>
                  <S.ItemContent>
                    <S.ItemValue>
                      {t('staking.rewards.value', {
                        value: stakingFormatter.format(currentReward.amount),
                      })}
                    </S.ItemValue>
                    <S.ItemSubValue>{currentReward.fiatInfo.amount}</S.ItemSubValue>
                  </S.ItemContent>
                </S.Item>
              </S.Table>
            </>
          )}
          <Spacer y={16} />
        </S.Content>
        <BottomButtonWrapHelper />
      </StepScrollView>
      <BottomButtonWrap>
        <Button
          disabled={!isReadyToContinue}
          isLoading={isPreparing}
          onPress={onContinue}
        >
          {t('continue')}
        </Button>
      </BottomButtonWrap>
    </S.Container>
  );
};

export const AmountStep = memo(AmountStepComponent);
